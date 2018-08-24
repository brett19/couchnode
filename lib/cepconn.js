'use strict';

var util = require('util');
var net = require('net');
var events = require('events');
var simplequery = require('./simplequery');

// Normal Messages (0x0000 upwards)
var cmdSuccess = 0x0001;
var cmdError = 0x0002;
var cmdStreamAddFilter = 0x0003;
var cmdStreamRemoveFilter = 0x0004;
var cmdStreamStart = 0x0005;
var cmdStreamRecover = 0x0006;
var cmdStreamStop = 0x0007;
var cmdStreamStarted = 0x0008;

// Temporary Messages (0x4000 upwards)

// Push Messages (0x8000 and up, ie: high bit set)
var cmdPushStreamAddFilter = 0x8001;
var cmdPushStreamRemoveFilter = 0x8002;
var cmdPushStreamItem = 0x8003;
var cmdPushStreamAdvance = 0x8004;
var cmdPushStreamEnd = 0x8005;

// Control Messages (0x7fff downwards)
var cmdOpenChannel = 0x7ffe;
var cmdCloseChannel = 0x7ffd;
var cmdFlowAck = 0x7ffc;

function parseAddress(addr) {
  var lastColonIdx = addr.lastIndexOf(':');
  if (lastColonIdx === -1) {
    throw new Error('invalid address format, missing `:`');
  }

  var host = addr.substr(0, lastColonIdx);
  var port = parseInt(addr.substr(lastColonIdx + 1));

  console.log(addr, lastColonIdx, host, port);

  return {
    host: host,
    port: port,
  };
}

function CepConn(addr) {
  var self = this;

  this.channels = {};
  this.channelIdx = 1;
  this.buffer = null;

  var parsedAddr = parseAddress(addr);
  this.socket = net.connect({
    host: parsedAddr.host,
    port: parsedAddr.port
  });
  this.socket.on('error', function(err) {
    self.emit('error', err);
  });
  this.socket.on('connect', function() {
    self.emit('connect');
  });
  this.socket.on('data', function(data) {
    if (self.buffer) {
      self.buffer = Buffer.concat([self.buffer, data]);
    } else {
      self.buffer = data;
    }

    while (true) {
      if (self.buffer.length >= 8) {
        var msgLen = self.buffer.readUInt32BE(0);
        if (self.buffer.length >= msgLen) {
          var msgData = self.buffer.slice(0, msgLen);
          //console.log('read', msgData);

          var channelId = msgData.readUInt16BE(4);
          var msgCmd = msgData.readUInt16BE(6);
          self.parsePacket(channelId, msgCmd, msgData.slice(8));

          self.buffer = self.buffer.slice(msgLen);
          continue;
        }
      }

      break;
    }
  });
}
util.inherits(CepConn, events.EventEmitter);

CepConn.prototype.parsePacket = function(channelId, msgCmd, payload) {
  console.log('parse', channelId, msgCmd, payload);

  var data = {
    type: msgCmd
  };

  switch (msgCmd) {
    // Control Messages
    case cmdOpenChannel:
      if (payload.length !== 2) {
        throw new Error('bad message');
      }
      data.channelId = payload.readUInt16BE(0);
      break;
    case cmdCloseChannel:
      if (payload.length !== 2) {
        throw new Error('bad message');
      }
      data.channelId = payload.readUInt16BE(0);
      break;

      // Generic Messages
    case cmdSuccess:
      break;
    case cmdError:
      if (payload.length < 4) {
        throw new Error('bad message');
      }
      data.code = payload.readUInt32BE(0);
      data.message = payload.slice(4);
      break;
    case cmdStreamAddFilter:
      if (payload.length < 2) {
        throw new Error('bad message');
      }
      data.filterId = payload.readUInt16BE(0);
      data.filter = payload.slice(2);
      break;
    case cmdStreamRemoveFilter:
      if (payload.length !== 2) {
        throw new Error('bad message');
      }
      data.filterId = payload.readUInt16BE(0);
      break;
    case cmdStreamStart:
      if (payload.length !== 0) {
        throw new Error('bad message');
      }
      break;
    case cmdStreamRecover:
      if (payload.length < 8) {
        throw new Error('bad message');
      }
      data.fromIndex = payload.slice(0, 0 + 8);
      data.instanceId = payload.slice(8).toString('utf8');
      break;
    case cmdStreamStop:
      if (payload.length !== 0) {
        throw new Error('bad message');
      }
      break;
    case cmdStreamStarted:
      if (payload.length === 0) {
        throw new Error('bad message');
      }
      data.instanceId = payload.slice(0).toString('utf8');
      break;

      // Push Messages
    case cmdPushStreamAddFilter:
      if (payload.length !== 2) {
        throw new Error('bad message');
      }

      data.filterId = payload.readUInt16BE(0);
      break;
    case cmdPushStreamRemoveFilter:
      if (payload.length !== 2) {
        throw new Error('bad message');
      }

      data.filterId = payload.readUInt16BE(0);
      break;
    case cmdPushStreamItem:
      if (payload.length < 8) {
        throw new Error('bad message');
      }
      data.eventIndex = payload.slice(0, 0 + 8);
      data.data = payload.slice(8);
      break;
    case cmdPushStreamAdvance:
      if (payload.length !== 8) {
        throw new Error('bad message');
      }
      data.eventIndex = payload.slice(0, 0 + 8);
      break;
    case cmdPushStreamEnd:
      if (payload.length < 4) {
        throw new Error('bad message');
      }
      data.reason = payload.readUInt32BE(0);
      data.message = payload.slice(4).toString('utf8');

    default:
      throw new Error('unknown message type');
  }

  if (channelId === 0) {
    this.handleMessage(data);
  } else {
    var channel = this.channels[channelId];
    if (!channel) {
      // TODO: handle bad channel
      console.log('bad channel', channelId);
    }

    if (data.type >= 0x8000) {
      // This is a push message
      channel.handlePushMessage(data);
    } else {
      if (channel.handlers.length === 0) {
        // TODO: handle no listener
        console.log('missing listener for', data);
        return;
      }

      var handler = channel.handlers.shift();
      if (data.type === cmdError) {
        handler(_parseErrMessage(data), null);
      } else {
        handler(null, data);
      }
    }
  }
};

CepConn.prototype.handleMessage = function(msg) {
  console.log('received control message', msg);
};

CepConn.prototype.writeMessage = function(channelId, msg, callback) {
  var data = null;
  switch (msg.type) {
    // Control Messages
    case cmdOpenChannel:
      data = Buffer.alloc(8 + 2);
      data.writeUInt16BE(msg.channelId, 8);
      break;
    case cmdCloseChannel:
      data = Buffer.alloc(8 + 2);
      data.writeUInt16BE(msg.channelId, 8);
      break;

      // Generic Messages
    case cmdSuccess:
      data = Buffer.alloc(8);
      break;
    case cmdError:
      var messageBuf = Buffer.from(msg.message);
      data = Buffer.alloc(8 + 4 + messageBuf.length);
      data.writeUInt32BE(msg.code, 8);
      messageBuf.copy(data, 12);
      break;
    case cmdStreamAddFilter:
      var filterBuf = Buffer.from(msg.filter);
      data = Buffer.alloc(8 + 2 + filterBuf.length);
      data.writeUInt16BE(msg.filterId, 8);
      filterBuf.copy(data, 10);
      break;
    case cmdStreamRemoveFilter:
      data = Buffer.alloc(8 + 2);
      data.writeUInt16BE(msg.filterId, 8);
      break;
    case cmdStreamStart:
      data = Buffer.alloc(8);
      break;
    case cmdStreamRecover:
      var instanceIdBuf = Buffer.from(msg.instanceId);
      data = Buffer.alloc(8 + 8 + instanceIdBuf.length);
      data.fromIndex.copy(data, 8);
      instanceIdBuf.copy(data, 8 + 8);
      break;
    case cmdStreamStop:
      data = Buffer.alloc(8);
      break;
    case cmdStreamStarted:
      var instanceIdBuf = Buffer.from(msg.instanceId);
      data = Buffer.alloc(8 + instanceIdBuf.length);
      instanceIdBuf.copy(data, 8);
      break;

      // Push Messages

    default:
      console.log('failed to serialize message', msg);
      if (callback) {
        callback(new Error('invalid message'));
      }
      return;
  }

  data.writeUInt32BE(data.length, 0);
  data.writeUInt16BE(channelId, 4);
  data.writeUInt16BE(msg.type, 6);

  console.log('write', data);
  this.socket.write(data, callback);
};

function _makeBadReplyErr() {
  return new Error('unexpected reply');
}

function _parseErrMessage(msg) {
  if (msg.type !== cmdError) {
    throw new Error('error parsing invalid message');
  }

  var err = new Error(msg.message);
  err.code = msg.code;
  return err;
}

function CepChannel(conn, id) {
  this.id = id;
  this.conn = conn;
  this.handlers = [];
}
util.inherits(CepChannel, events.EventEmitter);

CepChannel.prototype.handlePushMessage = function(msg) {
  console.log('got push message', msg);

  switch (msg.type) {
    case cmdPushStreamAddFilter:
      console.log('filter added', msg);
      return;
    case cmdPushStreamRemoveFilter:
      console.log('filter removed', msg);
      return;
    default:
      console.log('unknown push message');
  }
};

CepChannel.prototype.writeMessage = function(msg, callback) {
  this.conn.writeMessage(this.id, msg, callback);
};

CepChannel.prototype.streamAddFilter = function(filterId, filter, callback) {
  console.log('adding filter', filterId, filter);
  this.writeMessage({
    type: cmdStreamAddFilter,
    filterId: filterId,
    filter: filter
  });

  this.handlers.push(function(err, msg) {
    if (err) {
      callback(err);
      return;
    }

    switch (msg.type) {
      case cmdSuccess:
        callback(null);
        return;
    }

    callback(_makeBadReplyErr());
  });
};

CepChannel.prototype.streamRemoveFilter = function(filterId, callback) {
  console.log('removing filter', filterId);
  this.writeMessage({
    type: cmdStreamRemoveFilter,
    filterId: filterId
  });

  this.handlers.push(function(err, msg) {
    if (err) {
      callback(err);
      return;
    }

    switch (msg.type) {
      case cmdSuccess:
        callback(null);
        return;
    }

    callback(_makeBadReplyErr());
  });
};

CepChannel.prototype.streamStart = function(callback) {
  this.writeMessage({
    type: cmdStreamStart,
  });

  this.handlers.push(function(err, msg) {
    if (err) {
      callback(err);
      return;
    }

    switch (msg.type) {
      case cmdSuccess:
        callback(null);
        return;
    }

    callback(_makeBadReplyErr());
  });
};

CepConn.prototype.createChannel = function() {
  var channelId = this.channelIdx++;

  this.writeMessage(0, {
    type: cmdOpenChannel,
    channelId: channelId
  });

  var channel = new CepChannel(this, channelId);
  this.channels[channelId] = channel;

  return channel;
};

module.exports = CepConn;

var conn = new CepConn('127.0.0.1:8099');
conn.on('error', function(err) {
  console.log('cep error', err);
});
conn.on('connect', function() {
  console.log('cep connected');

  // Test ephemeral stuff.
  {
    var channel = conn.createChannel();

    channel.streamStart(function(err, res) {
      console.log(err, res);
    });
  }
});

return;

console.log(util.inspect(simplequery.parse({
  $key: 'test',
  age: { $lt: 20 },
  industry: 'technology'
}), { depth: 10 }));

// Durable Feed example (for example, to push a subset of your Couchbase
//  data down to sqlite or something...)
var feed = bucket.openFeed('test');

function processOne() {
  // pop the next item to process
  feed.popItem(function(err, item) {
    if (err) {
      console.log('feed pop error', err);
      return;
    }

    // keep the item for 5000ms
    item.refresh(5000, function(err) {
      if (err) {
        console.log('refresh error', err);
      }
    });

    // wait around for 3s, just for fun
    setTimeout(function() {

      // acknowledge processing complete for the item
      item.ack(function(err) {
        console.log('ack error', err);
      });

    }, 3000);
  });
}
processOne();

// Example of an ephemeral feed watch
bucket.watch({
  $key: 'test',
  age: { $lt: 20 },
  industry: 'technology'
}).on('error', function(err) {
  console.log('watch error', err);
}).on('item', function(item) {
  console.log('watch item', item);

  // websocket.send() could go here...
});

return;

var conn = new CepConn('127.0.0.1');
conn.on('error', function(err) {
  console.log('cep error', err);
});
conn.on('connect', function() {
  console.log('cep connected');

  // Test ephemeral stuff.
  {
    var stream = conn.createStream();

    stream.selectBucket('default', function(err) {
      console.log('select', err);

      stream.tmpGetNumVbuckets(function(err, numVbs) {
        console.log('numvbs', err, numVbs);

        var filter = [
          'equals', ['field', 'meta', 'key'],
          ['value', 'test']
        ];

        stream.streamAddFilter(0x9987, filter ? JSON.stringify(
          filter) : '', function(err) {
          console.log('add filter', err);

          for (var i = 0; i < numVbs; ++i) {
            (function(i) {
              console.log('starting stream', i);

              stream.streamStart(i, function(err) {
                console.log('stream start', i, err);
              });
            })(i);
          }
        });
      });
    });
  }

  // Test durable feeds stuff.
  /*
  {
    var stream = conn.createStream();

    stream.selectFeed('Test', function (err) {
      console.log('select', err);

      stream.feedPop(function (err, item) {
        console.log('pop', err, item);

        stream.feedRefresh(5000, function (err) {
          console.log('refresh', err);

          setTimeout(function () {
            console.log('waited');

            stream.feedAck(1, function (err) {
              console.log('ack', err);
            });
          }, 3000);
        });
      });
    });
  }
  */

});

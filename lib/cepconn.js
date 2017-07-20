'use strict';

var util = require('util');
var net = require('net');
var events = require('events');
var simplequery = require('./simplequery');


// Normal Messages (0x0000 upwards)
var cmdSelectFeed = 0x0001;
var cmdSuccess = 0x0002;
var cmdError = 0x0003;
var cmdFeedMutSet = 0x0004;
var cmdFeedMutExpire = 0x0005;
var cmdFeedMutDelete = 0x0006;
var cmdFeedMutRollback = 0x0007;
var cmdFeedPop = 0x0008;
var cmdFeedAck = 0x0009;
var cmdFeedCancel = 0x000a;
var cmdFeedRefresh = 0x000b;
var cmdStreamAddFilter = 0x000c;
var cmdStreamRemoveFilter = 0x000d;
var cmdStreamStart = 0x000e;
var cmdStreamRecover = 0x000f;
var cmdStreamStop = 0x0010;
var cmdBucketSelect = 0x0011;

// Temporary Messages (0x4000 upwards)
var cmdTmpGetNumVbuckets = 0x4000;
var cmdTmpNumVbuckets = 0x4001;

// Push Messages (0x8000 and up, ie: high bit set)
var cmdPushStreamMutSet = 0x8001;
var cmdPushStreamMutExpire = 0x8002;
var cmdPushStreamMutDelete = 0x8003;
var cmdPushStreamAdvance = 0x8004;
var cmdPushStreamSnapshot = 0x8005;
var cmdPushStreamSync = 0x8006;
var cmdPushStreamEnd = 0x8007;
var cmdPushStreamAddFilter = 0x8008;
var cmdPushStreamRemoveFilter = 0x8009;

// Control Messages (0x7fff downwards)
var cmdOpenStream = 0x7ffe;
var cmdCloseStream = 0x7ffd;



function CepConn(hostname) {
  var self = this;

  this.streams = {};
  this.streamIdx = 1;
  this.buffer = null;

  this.socket = net.connect({
    host: hostname,
    port: 11222
  });
  this.socket.on('error', function(err) {
    self.emit('error', err);
  });
  this.socket.on('connect', function() {
    self.emit('connect');
  });
  this.socket.on('data', function(data) {
    console.log('recv', data);

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
          console.log('read', msgData);

          var streamId = msgData.readUInt16BE(4);
          var msgCmd = msgData.readUInt16BE(6);
          self.parsePacket(streamId, msgCmd, msgData.slice(8));

          self.buffer = self.buffer.slice(msgLen);
          continue;
        }
      }

      break;
    }
  });
}
util.inherits(CepConn, events.EventEmitter);

CepConn.prototype.parsePacket = function(streamId, msgCmd, payload) {
  console.log('parse', streamId, msgCmd, payload);

  var data = {
    type: msgCmd
  };

  switch (msgCmd) {
  case cmdSelectFeed:
    data.feedName = payload.toString();
    break;
  case cmdSuccess:
    break;
  case cmdError:
    if (payload.length < 4) {
      throw new Error('bad message');
    }

    data.code = payload.readUInt32BE(0);
    data.message = payload.slice(4);
    break;
  case cmdFeedMutSet:
    if (payload.length < 39) {
      throw new Error('bad message');
    }

    var keyLength = payload.readUInt32BE(32);
    if (payload.length < 39 + keyLength) {
      throw new Error('bad message');
    }

    data.seqNo = payload.slice(0, 0+8);
    data.cas = payload.slice(8, 8+8);
    data.revNo = payload.slice(16, 16+8);
    data.expiry = payload.readUInt32BE(24);
    data.lockTime = payload.readUInt32BE(28);
    data.vbId = payload.readUInt16BE(36);
    data.datatype = payload[38];
    data.key = payload.slice(39, 39+keyLength);
    data.value = payload.slice(39+keyLength);
    break;
  case cmdFeedMutExpire:
    if (payload.length < 26) {
      throw new Error('bad message');
    }

    data.seqNo = payload.slice(0, 0+8);
    data.cas = payload.slice(8, 8+8);
    data.revNo = payload.slice(16, 16+8);
    data.vbId = payload.readUInt16BE(24);
    data.key = payload.slice(26);
    break;
  case cmdFeedMutDelete:
    if (payload.length < 26) {
      throw new Error('bad message');
    }

    data.seqNo = payload.slice(0, 0+8);
    data.cas = payload.slice(8, 8+8);
    data.revNo = payload.slice(16, 16+8);
    data.vbId = payload.readUInt16BE(24);
    data.key = payload.slice(26);
    break;
  case cmdFeedMutRollback:
    if (payload.length !== 4) {
      throw new Error('bad message');
    }

    data.seqNo = payload.slice(0, 0+8);
    break;
  case cmdFeedPop:
    if (payload.length !== 4) {
      throw new Error('bad message');
    }

    data.flags = payload.readUInt16BE(0);
    break;
  case cmdFeedAck:
    if (payload.length !== 4) {
      throw new Error('bad message');
    }

    data.durability = payload.readInt32BE(0);
    break;
  case cmdFeedCancel:
    if (payload.length !== 0) {
      throw new Error('bad message');
    }

    break;
  case cmdFeedRefresh:
    if (payload.length !== 4) {
      throw new Error('bad message');
    }

    data.period = payload.readUInt32BE(0);
    break;
  case cmdTmpGetNumVbuckets:
    if (payload.length !== 0) {
      throw new Error('bad message');
    }

    break;
  case cmdTmpNumVbuckets:
    if (payload.length !== 2) {
      throw new Error('bad message');
    }

    data.numVbuckets = payload.readUInt16BE(0);
    break;
  case cmdPushStreamMutSet:
    if (payload.length < 43) {
      throw new Error('bad message');
    }

    var keyLength = payload.readUInt32BE(32);
    if (payload.length < 43 + keyLength) {
      throw new Error('bad message');
    }

    var valueLength = payload.readUInt32BE(36);
    if (payload.length < 43 + keyLength + valueLength) {
      throw new Error('bad message');
    }

    if ((payload.length-43-keyLength-valueLength) % 2 != 0) {
      throw new Error('bad message');
    }

    data.seqNo = payload.slice(0, 0+8);
    data.cas = payload.slice(8, 8+8);
    data.revNo = payload.slice(16, 16+8);
    data.expiry = payload.readUInt32BE(24);
    data.lockTime = payload.readUInt32BE(28);
    // keyLength (uint32)
    // valueLength (uint32)
    data.vbId = payload.readUInt16BE(40);
    data.datatype = payload[42];
    data.key = payload.slice(43, 43+keyLength);
    data.value = payload.slice(43+keyLength, 43+keyLength+valueLength);

    data.filters = [];
    var readPos = 43+keyLength+valueLength;
    for (; readPos < payload.length; readPos += 2) {
      data.filters.push(payload.readUInt16BE(readPos));
    }

    break;
  case cmdPushStreamMutExpire:
    if (payload.length < 30) {
      throw new Error('bad message');
    }

    var keyLength = payload.readUInt32BE(24);
    if (payload.length < 30 + keyLength) {
      throw new Error('bad message');
    }

    if ((payload.length-30-keyLength) % 2 != 0) {
      throw new Error('bad message');
    }

    data.seqNo = payload.slice(0, 0+8);
    data.cas = payload.slice(8, 8+8);
    data.revNo = payload.slice(16, 16+8);
    // keyLength (uint32)
    data.vbId = payload.readUInt16BE(24);
    data.key = payload.slice(26, 26+keyLength);

    data.filters = [];
    var readPos = 30+keyLength;
    for (; readPos < payload.length; readPos += 2) {
      data.filters.push(payload.readUInt16BE(readPos));
    }

    break;
  case cmdPushStreamMutDelete:
    if (payload.length < 30) {
      throw new Error('bad message');
    }

    var keyLength = payload.readUInt32BE(24);
    if (payload.length < 30 + keyLength) {
      throw new Error('bad message');
    }

    if ((payload.length-30-keyLength) % 2 != 0) {
      throw new Error('bad message');
    }

    data.seqNo = payload.slice(0, 0+8);
    data.cas = payload.slice(8, 8+8);
    data.revNo = payload.slice(16, 16+8);
    // keyLength (uint32)
    data.vbId = payload.readUInt16BE(24);
    data.key = payload.slice(26, 26+keyLength);

    data.filters = [];
    var readPos = 30+keyLength;
    for (; readPos < payload.length; readPos += 2) {
      data.filters.push(payload.readUInt16BE(readPos));
    }

    break;
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


  case cmdOpenStream:
    if (payload.length !== 2) {
      // TODO: handle bad message
      console.log('bad packet');
    }

    data.streamId = payload.readUInt16BE(0);
    break;
  case cmdCloseStream:
    if (payload.length !== 2) {
      // TODO: handle bad message
      console.log('bad packet');
    }

    data.streamId = payload.readUInt16BE(0);
    break;
  default:
    console.log('failed to deserialize message');
    return;
  }

  if (streamId === 0) {
    this.handleMessage(data);
  } else {
    var stream = this.streams[streamId];
    if (!stream) {
      // TODO: handle bad stream
      console.log('bad stream', streamId);
    }

    if (data.type >= 0x8000) {
      // This is a push message
      stream.handlePushMessage(data);
    } else {
      if (stream.handlers.length === 0) {
        // TODO: handle no listener
        console.log('missing listener for', data);
        return;
      }

      var handler = stream.handlers.shift();
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

CepConn.prototype.writeMessage = function(streamId, msg, callback) {
  var data = null;
  switch (msg.type) {
  case cmdSelectFeed:
    var feedNameBuf = Buffer.from(msg.feedName);
    data = new Buffer(8 + feedNameBuf.length);
    feedNameBuf.copy(data, 8);
    break;
  case cmdSuccess:
    data = new Buffer(8);
    break;
  case cmdError:
    var messageBuf = Buffer.from(msg.message);
    data = new Buffer(8 + 4 + messageBuf.length);
    data.writeUInt32BE(msg.code, 8);
    messageBuf.copy(data, 12);
    break;
      // case cmdFeedMutSet:
      // case cmdFeedMutExpire:
      // case cmdFeedMutDelete:
      // case cmdFeedMutRollback:
  case cmdFeedPop:
    data = new Buffer(8 + 4);
    data.writeUInt32BE(msg.flags, 8);
    break;
  case cmdFeedAck:
    data = new Buffer(8 + 4);
    data.writeInt32BE(msg.durability, 8);
    break;
  case cmdFeedCancel:
    data = new Buffer(8);
    break;
  case cmdFeedRefresh:
    data = new Buffer(8 + 4);
    data.writeUInt32BE(msg.period, 8);
    break;
  case cmdStreamAddFilter:
    var filterBuf = Buffer.from(msg.filter);
    data = new Buffer(8 + 2 + filterBuf.length);
    data.writeUInt16BE(msg.filterId, 8);
    filterBuf.copy(data, 10);
    break;
  case cmdStreamRemoveFilter:
    data = new Buffer(8 + 2);
    data.writeUInt16BE(msg.filterId, 8);
    break;
  case cmdStreamStart:
    data = new Buffer(8 + 2);
    data.writeUInt16BE(msg.vbId, 8);
    break;
  case cmdStreamRecover:
    // TODO: Implement stream recovery packet
    callback(new Error('to be implemented'));
    break;
  case cmdStreamStop:
    data = new Buffer(8 + 2);
    data.writeUInt16BE(msg.vbId, 8);
    break;
  case cmdBucketSelect:
    var nameBuf = Buffer.from(msg.bucketName);
    data = new Buffer(8 + nameBuf.length);
    nameBuf.copy(data, 8);
    break;
  case cmdTmpGetNumVbuckets:
    data = new Buffer(8);
    break;
  case cmdTmpNumVbuckets:
    data = new Buffer(8 + 2);
    data.writeUInt16BE(msg.numVbuckets, 8);
    break;


  case cmdOpenStream:
    data = new Buffer(8 + 2);
    data.writeUInt16BE(msg.streamId, 8);
    break;
  case cmdCloseStream:
    data = new Buffer(8 + 2);
    data.writeUInt16BE(msg.streamId, 8);
    break;


  default:
    console.log('failed to serialize message', msg);
    if (callback) {
      callback(new Error('invalid message'));
    }
    return;
  }

  data.writeUInt32BE(data.length, 0);
  data.writeUInt16BE(streamId, 4);
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

function CepStream(conn, id) {
  this.id = id;
  this.conn = conn;
  this.handlers = [];
}
util.inherits(CepStream, events.EventEmitter);

CepStream.prototype.handlePushMessage = function(msg) {
  console.log('got push message', msg);

  switch (msg.type) {
  case cmdPushStreamMutSet:
    this.emit('streamItem', {
      data: {
        type: 'mutation',
        seqNo: msg.seqNo,
        cas: msg.cas,
        revNo: msg.revNo,
        expiry: msg.expiry,
        lockTime: msg.lockTime,
        vbId: msg.vbId,
        datatype: msg.datatype,
        key: msg.key,
        value: msg.value
      },
      filters: msg.filters
    });
    return;
  case cmdPushStreamMutExpire:
    this.emit('streamItem', {
      data: {
        type: 'expire',
        seqNo: msg.seqNo,
        cas: msg.cas,
        revNo: msg.revNo,
        key: msg.key
      },
      filters: msg.filters
    });
    return;
  case cmdPushStreamMutDelete:
    this.emit('streamItem', {
      data: {
        type: 'delete',
        seqNo: msg.seqNo,
        cas: msg.cas,
        revNo: msg.revNo,
        key: msg.key
      },
      filters: msg.filters
    });
    return;
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

CepStream.prototype.writeMessage = function(msg, callback) {
  this.conn.writeMessage(this.id, msg, callback);
};

CepStream.prototype.selectFeed = function(name, callback) {
  this.writeMessage({
    type: cmdSelectFeed,
    feedName: name
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

CepStream.prototype.feedAck = function(durability, callback) {
  this.writeMessage({
    type: cmdFeedAck,
    durability: durability,
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

CepStream.prototype.feedCancel = function(options, callback) {
  this.writeMessage({
    type: cmdFeedCancel,
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

CepStream.prototype.feedRefresh = function(periodMs, callback) {
  this.writeMessage({
    type: cmdFeedRefresh,
    period: periodMs,
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

CepStream.prototype.feedPop = function(callback) {
  this.writeMessage({
    type: cmdFeedPop
  });

  this.handlers.push(function(err, msg) {
    if (err) {
      callback(err);
      return;
    }

    switch (msg.type) {
    case cmdFeedMutSet:
      callback(null, {
        type: 'mutation',
        seqNo: msg.seqNo,
        cas: msg.cas,
        revNo: msg.revNo,
        expiry: msg.expiry,
        lockTime: msg.lockTime,
        vbId: msg.vbId,
        datatype: msg.datatype,
        key: msg.key,
        value: msg.value
      });
      return;
    case cmdFeedMutExpire:
      callback(null, {
        type: 'expire',
        seqNo: msg.seqNo,
        cas: msg.cas,
        revNo: msg.revNo,
        key: msg.key
      });
      return;
    case cmdFeedMutDelete:
      callback(null, {
        type: 'delete',
        seqNo: msg.seqNo,
        cas: msg.cas,
        revNo: msg.revNo,
        key: msg.key
      });
      return;
    case cmdFeedMutRollback:
      callback(null, {
        type: 'rollback',
        seqNo: msg.seqNo
      });
      return;
    }

    callback(_makeBadReplyErr());
  });
};

CepStream.prototype.selectBucket = function(name, callback) {
  this.writeMessage({
    type: cmdBucketSelect,
    bucketName: name
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

CepStream.prototype.tmpGetNumVbuckets = function(callback) {
  this.writeMessage({
    type: cmdTmpGetNumVbuckets
  });

  this.handlers.push(function(err, msg) {
    if (err) {
      callback(err);
      return;
    }

    switch (msg.type) {
    case cmdTmpNumVbuckets:
      callback(null, msg.numVbuckets);
      return;
    }

    callback(_makeBadReplyErr());
  });
};

CepStream.prototype.streamAddFilter = function(filterId, filter, callback) {
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

CepStream.prototype.streamStart = function(vbId, callback) {
  this.writeMessage({
    type: cmdStreamStart,
    vbId: vbId
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

CepConn.prototype.createStream = function() {
  var streamId = this.streamIdx++;

  this.writeMessage(0, {
    type: cmdOpenStream,
    streamId: streamId
  });

  var stream = new CepStream(this, streamId);
  this.streams[streamId] = stream;

  return stream;
};

module.exports = CepConn;

return;

console.log(util.inspect(simplequery.parse({
  $key: 'test',
  age: {$lt: 20},
  industry: 'technology'
}), {depth:10}));




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
  age: {$lt: 20},
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

    stream.selectBucket('default', function (err) {
      console.log('select', err);

      stream.tmpGetNumVbuckets(function (err, numVbs) {
        console.log('numvbs', err, numVbs);

        var filter = [
          'equals',
          ['field', 'meta', 'key'],
          ['value', 'test']
        ];

        stream.streamAddFilter(0x9987, filter ? JSON.stringify(filter) : '', function (err) {
          console.log('add filter', err);

          for (var i = 0; i < numVbs; ++i) {
            (function (i) {
              console.log('starting stream', i);

              stream.streamStart(i, function (err) {
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

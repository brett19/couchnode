'use strict';

var util = require('util');
var events = require('events');

var simplequery = require('./simplequery.js');
var CepConn = require('./cepconn');

function CepManager(hosts) {
  this.hosts = hosts;
  this.connectWait = null;
  this.conn = null;
  this.buckets = {};
}

CepManager.prototype._getHost = function(callback) {
  if (this.conn) {
    setImmediate(function() {
      callback(null, this.conn);
    });
    return;
  }

  if (this.connectWait) {
    this.connectWait.push(callback);
    return;
  }

  this.connectWait = [callback];

  var self = this;
  var conn = new CepConn('127.0.0.1');
  conn.on('error', function(err) {
    for (var i = 0; i < self.connectWait.length; i++) {
      self.connectWait[i](err);
    }
    self.connectWait = null;
  });
  conn.on('connect', function() {
    console.log('cep connected');
    self.conn = conn;
    for (var i = 0; i < self.connectWait.length; i++) {
      self.connectWait[i](null, conn);
    }
    self.connectWait = null;
  });
};

function FeedItem(stream, data) {
  this._stream = stream;
  Object.defineProperty(this, '_stream', {enumerable: false});

  for (var i in data) {
    if (data.hasOwnProperty(i)) {
      this[i] = data[i];
    }
  }
}

FeedItem.prototype.refresh = function(timeoutMs, callback) {
  this._stream.feedRefresh(timeoutMs, function (err) {
    console.log('refresh', err);

    if (err) {
      callback(err);
      return;
    }

    callback(null);
  });
};

FeedItem.prototype.ack = function(callback) {
  this._stream.feedAck(1, function (err) {
    console.log('ack', err);
    if (err) {
      callback(err);
      return;
    }

    callback(null);
  });
};

function FeedConn(stream) {
  this.stream = stream;
}

FeedConn.prototype.popItem = function(callback) {
  var stream = this.stream;

  stream.feedPop(function (err, item) {
    console.log('pop', err, item);

    if (err) {
      callback(err);
      return;
    }

    callback(null, new FeedItem(stream, item));
  });
};

CepManager.prototype.openFeed = function(feedName, callback) {
  this._getHost(function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    // TODO: This should probably be more temporary...
    var stream = conn.createStream();
    console.log('feed stream', stream);

    stream.selectFeed(feedName, function (err) {
      console.log('select', err);
      if (err) {
        callback(err);
        return;
      }

      callback(null, new FeedConn(stream));
    });

  });
};

function CepWatch(bucket) {
  this.cepBucket = bucket;
  this.filterId = -1;
  events.EventEmitter.call(this);
}
util.inherits(CepWatch, events.EventEmitter);

CepWatch.prototype.cancel = function() {
  this.cepBucket.removeWatch(this);
};

CepWatch.prototype.updateFilter = function(filter) {
  this.cepBucket.updateWatch(this, filter);
};

function CepBucket(manager, bucket) {
  this.manager = manager;
  this.bucket = bucket;
  this.stream = null;
  this.streamWait = null;
  this.watches = [];
  this.vbCount = -1;
}

CepBucket.prototype._getStream = function(callback) {
  if (this.stream) {
    callback(null, this.stream);
    return;
  }

  if (this.streamWait) {
    this.streamWait.push(callback);
    return;
  }

  this.streamWait = [callback];

  var self = this;
  this.manager._getHost(function(err, conn) {
    if (err) {
      for (var i = 0; i < self.streamWait.length; ++i) {
        self.streamWait[i](err);
      }
      self.streamWait = null;
      return;
    }

    var newStream = conn.createStream();
    newStream.selectBucket(self.bucket, function(err) {
      if (err) {
        for (var i = 0; i < self.streamWait.length; ++i) {
          self.streamWait[i](err);
        }
        self.streamWait = null;
        return;
      }

      newStream.tmpGetNumVbuckets(function(err, numVbs) {
        if (err) {
          for (var j = 0; j < self.streamWait.length; ++j) {
            self.streamWait[j](err);
          }
          self.streamWait = null;
          return;
        }

        self.stream = newStream;
        self.vbCount = numVbs;

        for (var k = 0; k < self.streamWait.length; ++k) {
          self.streamWait[k](null, self.stream);
        }
        self.streamWait = null;
      });
    });
  });
};

CepBucket.prototype._parseFilter = function(filter) {
  var filterStr = '';
  if (filter) {
    var filterParsed = simplequery.parse(filter);
    filterStr = JSON.stringify(filterParsed);
  }
  return filterStr;
};

CepBucket.prototype.addWatch = function(filter) {
  var watch = new CepWatch(this);

  var filterStr = this._parseFilter(filter);

  var self = this;
  this._getStream(function(err, stream) {
    console.log('_getStream', err);
    if (err) {
      watch.emit('error', err);
      return;
    }

    var isFirstFilter = (self.watches.length === 0);
    var filterId = self.watches.length;
    self.watches.push(filter);

    watch.filterId = filterId;

    stream.on('streamItem', function(item) {
      if (item.filters.indexOf(filterId) !== -1) {
        watch.emit('item', item.data);
      }
    });

    stream.streamAddFilter(filterId, filterStr, function(err) {
      console.log('add filter', filterId, filterStr, err);
      if (err) {
        watch.emit('error', err);
        return;
      }

      if (isFirstFilter) {
        for (var j = 0; j < self.vbCount; ++j) {
          stream.streamStart(j, function() {});
        }
      }

      watch.emit('ready');
    });
  });

  return watch;
};

CepBucket.prototype.updateWatch = function(watch, filter) {
  var filterId = watch.filterId;

  var filterStr = this._parseFilter(filter);

  this._getStream(function(err, stream) {
    if (err) {
      console.error(err);
      return;
    }

    stream.streamAddFilter(filterId, filterStr, function(err) {
      if (err) {
        console.error(err);
        return;
      }
    });
  });
};

CepBucket.prototype.removeWatch = function(watch) {
  var filterId = watch.filterId;
  this.watches[filterId] = null;

  this._getStream(function(err, stream) {
    if (err) {
      console.error(err);
      return;
    }

    stream.streamRemoveFilter(filterId, function(err) {
      if (err) {
        console.error(err);
        return;
      }

    });
  });
};

CepManager.prototype.bucket = function(name) {
  if (!this.buckets[name]) {
    this.buckets[name] = new CepBucket(this, name);
  }

  return this.buckets[name];
};

module.exports = CepManager;

/*
var cepmgr = new CepManager(['127.0.0.1']);

var stream = cepmgr.bucket('default').addWatch()
    .on('error', function(err) {
      console.log('watch error', err);
    }).on('item', function(item) {
      console.log('got item', item);
    });

cepmgr.openFeed('Test', function(err, feed) {
  console.log('cluster.openFeed', err, feed);

  feed.popItem(function(err, item) {
    console.log('feed.popItem', err, item);

    item.refresh(5000, function(err) {
      console.log('item.refresh', err);
    });
  });
});
*/

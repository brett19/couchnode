'use strict';

var util = require('util');
var events = require('events');
var Bucket = require('./bucket');

function MCBucket(options) {
  this._parent = options.parent;
  this._name = options.name;

  this._connected = false;
  this._numErrors = 0;

  this._buckets = [];
  for (var i = 0; i < this._parent._clusters.length; ++i) {
    var cluster = this._parent._clusters[i];
    var clusterBucketName = this._name;
    if (cluster.bucketMap && cluster.bucketMap[clusterBucketName]) {
      clusterBucketName = cluster.bucketMap[clusterBucketName];
    }
    var bucket = cluster.openBucket(clusterBucketName);

    bucket.on('connect', function() {
      // If nobody has notified that we are connected yet, lets do it.
      if (!this._connected) {
        this._connected = true;
        this.emit('connect');
      }
    }.bind(this));

    bucket.on('error', function(err) {
      // If all buckets errored, then throw this.
      this._numErrors++;
      if (this._numErrors === this._parent._clusters.length) {
        this.emit('error', err);
      }
    }.bind(this));

    this._buckets.push(bucket);
  }
}
util.inherits(MCBucket, events.EventEmitter);

MCBucket.prototype._getBucket = function() {
  return this._buckets[this._parent._activeClusterIdx];
};

MCBucket.prototype.manager = function() {
  var bucket = this._getBucket();
  return bucket.manager.apply(bucket, arguments);
};

MCBucket.prototype.disconnect = function() {
  for (var i = 0; i < this._buckets.length; ++i) {
    this._buckets[i].disconnect();
  }
};

MCBucket.prototype.invalidateQueryCache = function() {
  for (var i = 0; i < this._buckets.length; ++i) {
    this._buckets[i].invalidateQueryCache();
  }
};

MCBucket.prototype.setTranscoder = function(encoder, decoder) {
  for (var i = 0; i < this._buckets.length; ++i) {
    var bucket = this._buckets[i];
    bucket.setTranscoder.apply(bucket, arguments);
  }
};

function _wrapBucketMethod(method) {
  return function() {
    method.apply(this._getBucket(), arguments);
  };
}

MCBucket.prototype.query = _wrapBucketMethod(Bucket.prototype.query);
MCBucket.prototype.get = _wrapBucketMethod(Bucket.prototype.get);
MCBucket.prototype.getMulti = _wrapBucketMethod(Bucket.prototype.getMulti);
MCBucket.prototype.getAndTouch = _wrapBucketMethod(Bucket.prototype.getAndTouch);
MCBucket.prototype.getAndLock = _wrapBucketMethod(Bucket.prototype.getAndLock);
MCBucket.prototype.getReplica = _wrapBucketMethod(Bucket.prototype.getReplica);
MCBucket.prototype.touch = _wrapBucketMethod(Bucket.prototype.touch);
MCBucket.prototype.unlock = _wrapBucketMethod(Bucket.prototype.unlock);
MCBucket.prototype.remove = _wrapBucketMethod(Bucket.prototype.remove);
MCBucket.prototype.upsert = _wrapBucketMethod(Bucket.prototype.upsert);
MCBucket.prototype.insert = _wrapBucketMethod(Bucket.prototype.insert);
MCBucket.prototype.replace = _wrapBucketMethod(Bucket.prototype.replace);
MCBucket.prototype.append = _wrapBucketMethod(Bucket.prototype.append);
MCBucket.prototype.prepend = _wrapBucketMethod(Bucket.prototype.prepend);
MCBucket.prototype.counter = _wrapBucketMethod(Bucket.prototype.counter);
MCBucket.prototype.mapGet = _wrapBucketMethod(Bucket.prototype.mapGet);
MCBucket.prototype.mapRemove = _wrapBucketMethod(Bucket.prototype.mapRemove);
MCBucket.prototype.mapSize = _wrapBucketMethod(Bucket.prototype.mapSize);
MCBucket.prototype.mapAdd = _wrapBucketMethod(Bucket.prototype.mapAdd);
MCBucket.prototype.listGet = _wrapBucketMethod(Bucket.prototype.listGet);
MCBucket.prototype.listAppend = _wrapBucketMethod(Bucket.prototype.listAppend);
MCBucket.prototype.listPrepend = _wrapBucketMethod(Bucket.prototype.listPrepend);
MCBucket.prototype.listRemove = _wrapBucketMethod(Bucket.prototype.listRemove);
MCBucket.prototype.listSet = _wrapBucketMethod(Bucket.prototype.listSet);
MCBucket.prototype.listSize = _wrapBucketMethod(Bucket.prototype.listSize);
MCBucket.prototype.setAdd = _wrapBucketMethod(Bucket.prototype.setAdd);
MCBucket.prototype.setExists = _wrapBucketMethod(Bucket.prototype.setExists);
MCBucket.prototype.setSize = _wrapBucketMethod(Bucket.prototype.setSize);
MCBucket.prototype.setRemove = _wrapBucketMethod(Bucket.prototype.setRemove);
MCBucket.prototype.queuePush = _wrapBucketMethod(Bucket.prototype.queuePush);
MCBucket.prototype.queuePop = _wrapBucketMethod(Bucket.prototype.queuePop);
MCBucket.prototype.queueSize = _wrapBucketMethod(Bucket.prototype.queueSize);
MCBucket.prototype.lookupIn = _wrapBucketMethod(Bucket.prototype.lookupIn);
MCBucket.prototype.mutateIn = _wrapBucketMethod(Bucket.prototype.mutateIn);

Object.defineProperty(MCBucket.prototype, 'operationTimeout', {
  get: function() {
    return this._getBucket().operationTimeout;
  },
  set: function(val) {
    for (var i = 0; i < this._buckets.length; ++i) {
      this._buckets[i].operationTimeout = val;
    }
  }
});

Object.defineProperty(MCBucket.prototype, 'viewTimeout', {
  get: function() {
    return this._getBucket().viewTimeout;
  },
  set: function(val) {
    for (var i = 0; i < this._buckets.length; ++i) {
      this._buckets[i].viewTimeout = val;
    }
  }
});

Object.defineProperty(MCBucket.prototype, 'n1qlTimeout', {
  get: function() {
    return this._getBucket().n1qlTimeout;
  },
  set: function(val) {
    for (var i = 0; i < this._buckets.length; ++i) {
      this._buckets[i].n1qlTimeout = val;
    }
  }
});

Object.defineProperty(MCBucket.prototype, 'durabilityTimeout', {
  get: function() {
    return this._getBucket().durabilityTimeout;
  },
  set: function(val) {
    for (var i = 0; i < this._buckets.length; ++i) {
      this._buckets[i].durabilityTimeout = val;
    }
  }
});

Object.defineProperty(MCBucket.prototype, 'durabilityInterval', {
  get: function() {
    return this._getBucket().durabilityInterval;
  },
  set: function(val) {
    for (var i = 0; i < this._buckets.length; ++i) {
      this._buckets[i].durabilityInterval = val;
    }
  }
});

Object.defineProperty(MCBucket.prototype, 'managementTimeout', {
  get: function() {
    return this._getBucket().managementTimeout;
  },
  set: function(val) {
    for (var i = 0; i < this._buckets.length; ++i) {
      this._buckets[i].managementTimeout = val;
    }
  }
});

Object.defineProperty(MCBucket.prototype, 'configThrottle', {
  get: function() {
    return this._getBucket().configThrottle;
  },
  set: function(val) {
    for (var i = 0; i < this._buckets.length; ++i) {
      this._buckets[i].configThrottle = val;
    }
  }
});

Object.defineProperty(MCBucket.prototype, 'connectionTimeout', {
  get: function() {
    return this._getBucket().connectionTimeout;
  },
  set: function(val) {
    for (var i = 0; i < this._buckets.length; ++i) {
      this._buckets[i].connectionTimeout = val;
    }
  }
});

Object.defineProperty(MCBucket.prototype, 'nodeConnectionTimeout', {
  get: function() {
    return this._getBucket().nodeConnectionTimeout;
  },
  set: function(val) {
    for (var i = 0; i < this._buckets.length; ++i) {
      this._buckets[i].nodeConnectionTimeout = val;
    }
  }
});

Object.defineProperty(MCBucket.prototype, 'lcbVersion', {
  get: function() {
    return this._getBucket().lcbVersion;
  },
  writeable: false
});

Object.defineProperty(MCBucket.prototype, 'clientVersion', {
  get: function() {
    return this._getBucket().clientVersion;
  },
  writeable: false
});

module.exports = MCBucket;

'use strict';

var errors = require('./errors');
var Cluster = require('./cluster');
var MCBucket = require('./mcbucket');

function MCCluster(options) {
  this._clusters = [];
  this._buckets = [];

  var clusterConfigs = options.clusters;
  for (var i = 0; i < clusterConfigs.length; ++i) {
    var clusterConfig = clusterConfigs[i];

    var cluster = new Cluster(clusterConfig.connstr);
    cluster.bucketMap = clusterConfig.bucketMap;

    if (clusterConfig.username || clusterConfig.password) {
      cluster.authenticate(clusterConfig.username, clusterConfig.password);
    }

    this._clusters.push(cluster);
  }

  this._activeClusterIdx = 0;
  this._startWatcher();
}

MCCluster.prototype._startWatcher = function() {
  var failMarker = 0;
  var failCount = 0;
  setInterval(function() {
    var bucket = this._getAnyBucket();
    if (bucket) {
      var lclFailMarker = failMarker;
      bucket.get('_i_dont_exist', function(err) {
        // Ignore results from the older cluster
        if (lclFailMarker !== failMarker) {
          return;
        }

        // If there is no error, reset fail counter and continue
        if (!err || err.code === errors.keyNotFound) {
          failCount = 0;
          return;
        }

        // Increment count and maybe fail over.
        failCount++;
        if (failCount >= 2) {
          failMarker++;
          this.failover();
          failCount = 0;
        }
      }.bind(this));
    }
  }.bind(this), 1000);
};

MCCluster.prototype._getAnyBucket = function() {
  if (this._buckets.length === 0) {
    return null;
  }
  return this._buckets[0];
};

MCCluster.prototype.failover = function() {
  console.log('detected errors, cluster fail over started');

  this._activeClusterIdx++;
  if (this._activeClusterIdx >= this._clusters.length) {
    this._activeClusterIdx = 0;
  }
};

MCCluster.prototype.enableCbas = function(hosts) {
  for (var i = 0; i < this._clusters.length; ++i) {
    this._clusters[i].enableCbas(hosts);
  }
};

MCCluster.prototype.authenticate = function(auther) {
  throw new Error('authentication must be done through the cluster config');
};

MCCluster.prototype.openBucket = function(name, password, callback) {
  var bucket = new MCBucket({
    parent: this,
    name: name,
    password: password
  });
  if (callback) {
    bucket.on('connect', callback);
    bucket.on('error', callback);
  }
  this._buckets.push(bucket);
  return bucket;
};

MCCluster.prototype.query = function(query, params, callback) {
  var cluster = this._clusters[this._activeClusterIdx];
  return cluster.query.apply(cluster, arguments);
};

MCCluster.prototype.manager = function(username, password) {
  var cluster = this._clusters[this._activeClusterIdx];
  return cluster.manager.apply(cluster, arguments);
};

module.exports = MCCluster;

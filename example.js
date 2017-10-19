'use strict';

var couchbase = require('./lib/couchbase.js');

// MCCluster has an identical API to Cluster, except that authentication
//  is passed during instantiation of MCCluster, and the `authenticate`
//  method throws an error.  Buckets opened via MCCluster have an identical
//  API to a normally opened bucket.
var cluster = new couchbase.MCCluster({
  clusters: [
    {
      connstr: 'couchbase://172.23.123.251'
    },
    {
      connstr: 'couchbase://localhost',
      username: 'Administrator',
      password: 'password'
    }
  ]
});

var bucket = cluster.openBucket('test', function(err) {
  console.log('bucket connected:', err);
});

setInterval(function() {
  bucket.get('testdoc', function(err, res) {
    if (err) {
      console.log('fetch error:', err);
    } else {
      console.log('fetched', res.value);
    }
  });
}, 1000);

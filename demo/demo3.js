'use strict';

// Imports!  Yay.
var couchbase = require('../lib/couchbase.js');
var express = require('express');
var http = require('http');
var url = require('url');

// Lets connect to our cluster
var cluster = new couchbase.Cluster('couchbase://localhost');

// Now we should enable eventing service by specifying the eventing hosts.
cluster.enableFeeds('localhost');

// Need to authenticate before opening any buckets.
cluster.authenticate('Administrator', 'password');

// Finally, lets open a bucket to play with.
var bucket = cluster.openBucket('default');


var useWatch = false;
var cache = {};

// Start watching for deletions on this bucket
var iwatch = bucket.watch({
  $mutationType: 'delete'
});

// Delete items from the cache when we see them on the stream.
iwatch.on('item', function(item) {
  console.log('DELETION', item.key.toString());

  if (useWatch) {
    var key = item.key.toString();
    delete cache[key];
  }
});


// Lets set up a simple express web service
var app = express();
var server = http.createServer(app);

// Handle get requests from the cache
app.get('/getcached/:name', function (req, res) {
  var key = req.params.name;

  if (!cache[key]) {
    res.sendStatus(404);
    return;
  }

  res.send(cache[key]);
});

// Handle cache requests for the cache
app.get('/get/:name', function(req, res) {
  var key = req.params.name;

  bucket.get(key, function(err, getRes) {
    if (err) {
      res.send(err);
      return;
    }

    cache[key] = getRes.value;
    res.send(cache[key]);
  });
});

app.get('/enablewatch', function(req, res) {
  useWatch = true;
  res.send('cache invalidation enabled');
});

app.get('/disablewatch', function(req, res) {
  useWatch = false;
  res.send('cache invalidation disabled');
});

// Start listening on port 3000
server.listen(3001, function listening() {
  console.log('Listening on %d', server.address().port);
});

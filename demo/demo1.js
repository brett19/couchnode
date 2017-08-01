'use strict';

// Imports!  Yay.
var couchbase = require('../lib/couchbase.js');
var express = require('express');
var http = require('http');
var url = require('url');
var fs = require('fs');
var WebSocket = require('ws');

// Lets connect to our cluster
var cluster = new couchbase.Cluster('couchbase://localhost');

// Now we should enable eventing service by specifying the eventing hosts.
cluster.enableFeeds('localhost');

// Need to authenticate before opening any buckets.
cluster.authenticate('Administrator', 'password');

// Finally, lets open a bucket to play with.
var bucket = cluster.openBucket('default');


// Lets set up a simple express web service
var app = express();
var server = http.createServer(app);
var wss = new WebSocket.Server({ server: server });

// Handle the default path by serving demo1.html
app.get('/', function (req, res) {
  res.sendFile('demo1.html', {root: __dirname});
});


// Handle incoming websocket connections
wss.on('connection', function connection(ws, req) {
  var location = url.parse(req.url, true);
  var query = location.query;

  if (query.q) {
    // Parse the users query directly
    var q = JSON.parse(query.q);

    // Begin watching based on this query
    var watchq = bucket.watch(q);

    // Handle items by sending their value directly on the wire.
    watchq.on('item', function(item) {
      ws.send(item.value.toString());
    });

    // If the connection is closed, lets stop watching.
    ws.on('close', function() {
      watchq.cancel();
    });
  }

  if (query.s) {
    // Begin watching using a query that matches against the
    // requested symbol, prefixed with `ticker-`.
    var watcht = bucket.watch({
      $mutationType: 'set',
      $key: 'ticker-' + query.s
    });

    // Handle items by sending their value directly on the wire.
    watcht.on('item', function(item) {
      ws.send(item.value.toString());
    });

    // If the connection is closed, lets stop watching.
    ws.on('close', function() {
      watcht.cancel();
    });
  }

  if (query.i) {
    // Begin watching using a query that matches against the `industry`
    //  field within the document.
    var watchi = bucket.watch({
      $mutationType: 'set',
      industry: query.i
    });

    // Handle items by sending their value directly on the wire.
    watchi.on('item', function(item) {
      ws.send(item.value.toString());
    });

    // If the connection is closed, lets stop watching.
    ws.on('close', function() {
      watchi.cancel();
    });
  }
});

// Start listening on port 3000
server.listen(3000, function listening() {
  console.log('Listening on %d', server.address().port);
});

'use strict';

// Imports!  Yay.
var couchbase = require('../lib/couchbase.js');

// Lets connect to our cluster
var cluster = new couchbase.Cluster('couchbase://localhost');

// Now we should enable eventing service by specifying the eventing hosts.
cluster.enableFeeds('localhost');

// Need to authenticate before opening any buckets.
cluster.authenticate('Administrator', 'password');

// Feeds are immutable!
cluster.openFeed('users', function(err, feed) {
  if (err) {
    console.error(err);
    return;
  }

  function processOneUser() {
    feed.popItem(function (err, item) {
      console.log('feed.popItem', err, item.value.toString());

      // This is implemented, cancels the item
      item.cancel();

      // This is implemented, I'm still busy with this item, don't timeout
      item.refresh(5000, function(err) {

      });

      // DONT DEFINE THIS IF YOU DONT LIKE IT :D
      item.ack({persistTo:'one,all,'}, function(err) {
        console.log('item.ack', err);

        processOneUser();
      });
    });
  }
  processOneUser();
});



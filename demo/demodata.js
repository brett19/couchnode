'use strict';

var couchbase = require('../lib/couchbase.js');
var tickerData = require('./sp500');

var cluster = new couchbase.Cluster('couchbase://localhost');
cluster.authenticate('Administrator', 'password');
var bucket = cluster.openBucket('default');

tickerData = tickerData.slice(0, 50);

function upsertTickers(callback) {
  var tickersLeft = tickerData.length;
  for (var i = 0; i < tickerData.length; ++i) {
    var ticker = tickerData[i];

    ticker.price = 100;

    bucket.upsert('ticker-' + ticker.sym, ticker, function (err) {
      if (err) {
        console.error(err);
      }

      tickersLeft--;
      if (tickersLeft === 0) {
        callback(null);
      }
    });
  }
}

function updateRandom(callback) {
  var numTickers = tickerData.length;
  var rndTickerIdx = Math.floor(Math.random() * numTickers);
  var ticker = tickerData[rndTickerIdx];

  bucket.get('ticker-' + ticker.sym, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    var variation = Math.floor(Math.random() * 2.00 * 100) / 100;
    if (Math.random() < 0.5) {
      res.value.price -= variation;
    } else {
      res.value.price += variation;
    }

    bucket.upsert('ticker-' + ticker.sym, res.value, function(err) {
      if (err) {
        callback(err);
        return;
      }

      callback(null);
    });
  });
}

function recursiveRandomUpdate() {
  updateRandom(function(err) {
    if (err) {
      console.error(err);
    }

    setTimeout(function() {
      recursiveRandomUpdate();
    }, 100);
  });
}

upsertTickers(function(err) {
  console.log('upserted tickers', err);

  console.log('starting random mutations');
  recursiveRandomUpdate();
});

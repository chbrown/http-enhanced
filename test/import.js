/*jslint node: true */
var tap = require('tap');

tap.test('require should substantiate', function(t) {
  var http = require('../');
  t.ok(http, 'http should load from index.js in parent directory');
  t.end();
});

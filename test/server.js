/*jslint node: true */
var tap = require('tap');
var request = require('request');

var http = require('..');

var handler = function(req, res) {
  if (req.url == '/empty') {
    res.status(204).end();
  }
  else if (req.url == '/sample.ngjson') {
    res.ngjson({name: 'Chris'});
  }
  else if (req.url == '/sample.xjson') {
    res.xjson({name: 'Chris'});
  }
  else if (req.url == '/sample.json') {
    res.json({name: 'Chris'});
  }
  else if (req.url == '/body.html') {
    res.html('<h1>Hello tests!</h1>');
  }
  else if (req.url == '/plain.txt') {
    res.text('Hello test suite.');
  }
  else if (req.url == '/relocator') {
    res.redirect('/elsewhere');
  }
  else if (req.url == '/input') {
    req.readToEnd('utf8', function(err, body) {
      res.text(body.length.toString());
    });
  }
  else if (req.url == '/extract-id') {
    req.readData(function(err, data) {
      res.text(data.id.toString());
    });
  }
  else if (req.url == '/extract-title') {
    req.readData(function(err, data) {
      res.text(data.title);
    });
  }
  else {
    res.die('Not found, dammit!');
  }
};

tap.test('basic server', function(t) {
  t.plan(21);

  var hostname = '127.0.0.1';
  // port = 0 finds random free port
  var server = http.createServer(handler).listen(0, hostname, function() {
    // server running, ready to run tests
    var port = server.address().port;
    var addrport = 'http://' + hostname + ':' + port;

    request.get(addrport + '/empty', function(err, res, body) {
      t.equal(res.statusCode, 204);
      t.equal(body, '');
    });

    request.get(addrport + '/sample.ngjson', function(err, res, body) {
      t.equal(res.headers['content-type'], 'application/json');
      t.equal(res.statusCode, 200);
      t.equal(body, ')]}\',\n{"name":"Chris"}');
    });

    request.get(addrport + '/sample.xjson', function(err, res, body) {
      t.equal(res.statusCode, 200);
      t.equal(body, 'for (;;);{"name":"Chris"}');
    });

    request.get(addrport + '/body.html', function(err, res, body) {
      t.equal(res.headers['content-type'], 'text/html');
      t.equal(body, '<h1>Hello tests!</h1>');
    });

    request.get(addrport + '/plain.txt', function(err, res, body) {
      t.equal(res.headers['content-type'], 'text/plain');
      t.equal(body, 'Hello test suite.');
    });

    request.get(addrport + '/null-and-void', function(err, res, body) {
      t.equal(res.statusCode, 500);
      t.equal(body, 'Failure: Not found, dammit!');
    });

    request.get(addrport + '/relocator', {followRedirect: false}, function(err, res, body) {
      t.equal(res.statusCode, 302);
      t.equal(body, 'Redirecting to: /elsewhere');
    });

    var input_body = 'This is only a test, so chill.';
    request.post(addrport + '/input', {body: input_body}, function(err, res, body) {
      t.equal(res.statusCode, 200);
      t.equal(body, input_body.length.toString());
    });

    var extract = {id: 'king', title: 'tortuga'};
    request.post(addrport + '/extract-id', {form: extract}, function(err, res, body) {
      t.equal(res.statusCode, 200);
      t.equal(body, 'king');
    });

    request.post(addrport + '/extract-title', {json: extract}, function(err, res, body) {
      t.equal(res.statusCode, 200);
      t.equal(body, 'tortuga');
    });
  });

  t.tearDown(function() {
    server.close();
  });
});

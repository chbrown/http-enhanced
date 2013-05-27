# http-enhanced

My [wrappers](https://github.com/chbrown/wrappers) library was a bit over the top.

This is meant to be thinner, just a few helpers for the very simply `req` /
`res` that Node.js's [`http`](http://nodejs.org/api/http.html) API provides.

However, if you don't call any of the methods, nothing changes. You'll just have
some extra prototype methods lying around that never did anything.

## Install

At the command line from the [npm](https://npmjs.org/) registry:

    npm install http-enhanced

Or from github:

    npm install git://github.com/chbrown/http-enhanced.git

Or in your `package.json`:

    "dependencies" : {
      "http-enhanced": "*",
      ...
    }

## Usage

Most often, you'll [create a server](http://nodejs.org/api/http.html#http_event_request)
like this:

    var http = require('http');
    http.createServer(function (req, res) {

      // req (request) is an instance of http.IncomingMessage
      var url = req.url;

      // res (response) is an instance of http.ServerResponse
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('Hello, world!');
      res.end();

    }).listen(80);

A simple change will let you use some shortcuts:

    var http = require('http-enhanced');
    http.createServer(function (req, res) {

      // save incoming data to req.data
      req.saveData();

      // wait until the request ends, or call immediately if it already has
      req.wait(function() {
        var reversed = req.data.split('').reverse().join('');

        // 1. set HTTP status code to 200,
        // 2. the Content-Type header to 'application/json',
        // 3. and stringify the given object, all in one go:
        res.json({success: true, message: reversed});
      });

    }).listen(80);

## Request

**wait**: return immediately (with `setImmediate`, which replaced `process.nextTick`) or after the request has ended, if it has not yet ended. This is useful because the `req.on('end')` event might get triggered if you do some other async stuff before waiting to hear that, in which case you have to check that `req.complete == true`, but this rolls both checks into one function.

    req.wait(function() {
      console.log("Always callback, always true! " + req.complete);
    });

**saveData**: record incoming data `req.on('data')` to a string at `req.data`. This won't work for binary data, since it's just concatenating to a string.

    req.saveData();

## Response

**writeEnd**: `res.end(data)` is supposed to write the data and then end the
response. From the docs:

> If data is specified, it is equivalent to calling
> `request.write(data, encoding)` followed by `request.end()`.

But sometimes it doesn't, so we make that that's what it's really equivalent
to (minus the optional encoding).

    res.writeEnd('Hello world');

**writeAll**: Roll `writeHead()` and `writeEnd()` all into one:

    res.writeAll(200, 'text/xml', '<root>Haha, not really.</root>');

**json**: Set `Content-Type` to `application/json` and encode the object with `JSON.stringify`.

    res.json({success: true, message: "Hello world!"});

If `JSON.stringify` throws an error trying to encode your object,
it will fall back to `util.inspect` with the options: `{showHidden: true, depth: null}`.

**html**: Set status code to 200 and `Content-Type` to `text/html`.

    res.html('<p><i>Hello</i> world!.</p>');

**text**: Set status code to 200 and `Content-Type` to `text/plain`.

    res.text('Hello world.');

**die**: Set status code to 500 and `Content-Type` to `text/plain`.

    res.text('Goodbye, cruel world.');

**redirect**: Set status code to 302 and the `Location` header to the given string.
Also writes "Redirecting to: /index?error=404" (or whatever url you use).

    res.redirect('/index?error=404');

## License

Copyright © 2013 Christopher Brown. [MIT Licensed](LICENSE).

# http-enhanced

[![latest version published to npm](https://badge.fury.io/js/http-enhanced.svg)](https://www.npmjs.com/package/http-enhanced)
[![Travis CI build status](https://travis-ci.org/chbrown/http-enhanced.svg?branch=master)](https://travis-ci.org/chbrown/http-enhanced)

A drop-in replacement (add-on, really) for Node.js standard library's
[`http`](http://nodejs.org/api/http.html) module.

It adds a few methods to the `http.ServerResponse` and `http.IncomingMessage`
prototypes. If you don't call any of the methods, nothing changes. You'll just
have some extra methods lying around that never did anything.


## Install

From the [npmjs](https://npmjs.org/) registry:

    npm install --save http-enhanced


## Usage

Most often, you'll [create a server](http://nodejs.org/api/http.html#http_event_request)
like this:

    var http = require('http')
    http.createServer(function (req, res) {

      // req (request) is an instance of http.IncomingMessage
      var url = req.url

      // res (response) is an instance of http.ServerResponse
      res.writeHead(200, {'Content-Type': 'text/html'})
      res.write('Hello, world!')
      res.end()

    }).listen(80)

A simple change will let you use some shortcuts:

    var http = require('http-enhanced')
    http.createServer(function (req, res) {

      // save incoming data to req.data and wait until the request ends,
      //   or callback immediately (setImmediate) if it already has
      req.readToEnd('utf8', function(err, data) {
        var reversed = data.split('').reverse().join('')

        // 1. set HTTP status code to 200,
        // 2. set the Content-Type header to 'application/json',
        // 3. and stringify the given object, all in one go:
        res.json({success: true, message: reversed})
      })

    }).listen(80)


## Request

### request.readToEnd([encoding], [callback])

* `encoding` String | null If specified, callback gets a String instead of a Buffer.
* `callback` Function | null Call some `function(err, data)` when the request ends.
    * If only one argument is given, it must be the callback.

Read the request into a buffer until the `end` event is triggered, which will
trigger `callback(Error || null, Buffer || null)`. This uses "new-style"
streams, listening for `readable` events and calling `read()`, coercing to a
Buffer when needed.

This function can be called multiple times, with or without the callback.

A popular use case might be if you want to upload a file and do a lot of I/O
independently but at the same time. You might call `req.readToEnd()` with no
arguments at the beginning of your request handler, and _then_ set off your
expensive I/O calls.

You can get back a **string** if you specify the encoding, e.g.,
`req.readToEnd('utf8', function(err, string) { ... })`. This is exactly
equivalent to calling:

    req.readToEnd(function(err, buffer) {
      var string = buffer.toString(encoding)
      ...
    })

If the request has already ended, any captured buffer will be immediately
returned, via `setImmediate` (which replaced `process.nextTick` in node v0.10).
This might occur if you start listening for `data` at some point, in which
case the request is flipped to "old-style" streams, and `end` might occur
before you listen for it.

For that reason, and that calling `req.read()` from multiple listeners could
produce problems, you should not use either of these:

    req.setEncoding('utf8') // no!
    req.on('data', function(chunk) { ... }) // robot, NO!

So you shouldn't call `req.readToEnd()` (without a callback) in your pipeline
unless you're going to call it again with a callback, later.

### request.readData(callback)

Wraps `req.readToEnd()` and uses the request's `Content-Type` header to determine whether to parse the request as JSON or a form querystring.

    callback = function(error, data) { ... }

- `application/json`: Returns result of `JSON.parse`. Interprets empty `application/json` requests as `null`, instead of throwing an Error, since `JSON.parse('')` will raise a SyntaxError normally. If `JSON.parse(body)` throws an error due to invalid JSON, calls back with the error.
- `application/x-www-form-urlencoded`: Returns result of `querystring.parse`.
- otherwise, returns the same thing as `readToEnd`, a Buffer.

Does not work for uploads (use something like [formidable](https://github.com/felixge/node-formidable)).

Returns the parsed querystring for GET requests.


## Response

### response.writeEnd(data)

* `data` String String to write to response

The standard `http` built-in `response.end(data)` is supposed to write the
data and then end the response. From the docs:

> If data is specified, it is equivalent to calling
> `request.write(data, encoding)` followed by `request.end()`.

But sometimes it doesn't, and `writeEnd` makes sure that's what it really does
(minus the optional encoding).

    res.writeEnd('Hello world')

### response.writeAll(statusCode, contentType, data)

* `statusCode` Number Three-digit HTTP status code
* `contentType` String MIME type
* `data` String String to write to response

Roll `writeHead(statusCode, contentType)` and `writeEnd(data)` all into one:

    res.writeAll(200, 'text/xml', '<root>Haha, not really.</root>')

### response.json(object)

* `object` Object JSON-stringifiable object

Write response to end with `Content-Type: application/json` and HTTP status
code 200, encoding the object with `JSON.stringify`.

    res.json({success: true, message: "Hello world!"})

If `JSON.stringify` throws an error trying to encode your object (e.g., if it
has circular references), it will fall back to `util.inspect` with the options:
`{showHidden: true, depth: null}`.

### response.html(data)

* `data` String HTML to write to response.

Set status code to 200 and `Content-Type` to `text/html`.

    res.html('<p><i>Hello</i> world!.</p>')

### response.text(data)

* `data` String Plain text to write to response.

Set status code to 200 and `Content-Type` to `text/plain`.

    res.text('Hello world.')

### response.die([error])

* `error` String | Error Will call `error.toString()`.

Set status code to 500 (if it's currently 200) and `Content-Type` to
`text/plain`, using the string representation of the given error, prepended
with the label "Failure: ", as the response body (or just "Failure" if no
error is provided). If you want to use a 4xx or 5xx status code other than
500, call, e.g., `.status(418)` before calling `.die()`.

    res.die('Goodbye, cruel world.')

### response.redirect(location)

* `location` String (a URL)

Set status code to given status code (302 by default) and the `Location`
header to the given string. Also writes the text,
"Redirecting to: /index?error=404" (or whatever url you use).

    res.redirect('/index?error=404')

To use a different 3xx status code, set it before calling redirect.

    res.status(303).redirect('/login')

## License

Copyright 2013-2014 Christopher Brown. [MIT Licensed](http://opensource.org/licenses/MIT).

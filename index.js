/*jslint node: true */ /*globals setImmediate */
var http = require('http');
var querystring = require('querystring');
var url = require('url');
var util = require('util');

// Request
http.IncomingMessage.prototype.readToEnd = function(encoding, callback) {
  // req.readToEnd([encoding], callback);
  // callback signature: function(err, Buffer | null | String)
  // this basically has {decodeStrings: true}, even if we send it an encoding

  // encoding is optional, adjust if we only got less than two arguments
  if (callback === undefined) {
    callback = encoding;
    encoding = undefined;
  }
  // encoding may still be undefined, in which case
  // we will just return a buffer, if callback is specifed

  var self = this;

  // is this closure unnecessarily messy?
  var success = function() {
    var buffer = self._readToEnd_buffer;
    callback(null, encoding ? buffer.toString(encoding) : buffer);
  };

  // _readToEnd_state: undefined -> 'reading' -> 'ended'
  if (this._readToEnd_state === 'ended') {
    if (callback) setImmediate(success);
  }
  else if (this._readToEnd_state === 'reading') {
    if (callback) this.on('end', success);
  }
  else {
    // initialize
    this._readToEnd_state = 'reading';
    this._readToEnd_buffer = new Buffer(0);

    // start listening for 'readable' events.
    this.on('readable', function() {
      var chunk = self.read();
      if (chunk !== null) {
        if (!Buffer.isBuffer(chunk)) {
          // the user should really not be using req.setEncoding('whatever'),
          //   but we don't want to crash if they do
          chunk = new Buffer(chunk);
        }
        self._readToEnd_buffer = Buffer.concat([self._readToEnd_buffer, chunk]);
      }
    });

    if (callback) {
      this.on('error', callback);
    }

    // can 'error' and 'end' both be called? that might be bad.
    this.on('end', function() {
      self._readToEnd_state = 'ended';
      if (callback) success();
    });
  }
};
http.IncomingMessage.prototype.readData = function(callback) {
  /** Opinionated input/form reader

  callback signature: function(err, Object)
  */
  if (this.method == 'GET') {
    var data = url.parse(this.url, true).query;
    setImmediate(function() {
      callback(null, data);
    });
  }
  else {
    var content_type = this.headers['content-type'] || '';
    this.readToEnd(function(err, body) {
      if (err) return callback(err);

      if (content_type.match(/application\/json/)) {
        // empty body translates to null
        if (body.length === 0) {
          callback(null, null);
        }
        else {
          try {
            callback(null, JSON.parse(body));
          }
          catch (exc) {
            callback(exc);
          }
        }
      }
      else if (content_type.match(/application\/x-www-form-urlencoded/)) {
        // will querystring.parse ever throw?
        callback(null, querystring.parse(body.toString()));
      }
      else {
        callback(null, body);
      }
    });
  }
};

// Response
http.ServerResponse.prototype.writeEnd = function(s) {
  this.write(s);
  this.end();
};
http.ServerResponse.prototype.writeAll = function(http_status_code, content_type, body) {
  this.writeHead(http_status_code, {'Content-Type': content_type});
  this.write(body);
  this.end();
};
http.ServerResponse.prototype.json = function(http_status_code, obj) {
  if (obj === undefined) {
    obj = http_status_code;
    http_status_code = 200;
  }

  var json;
  try {
    json = JSON.stringify(obj);
  }
  catch (exc) {
    json = util.inspect(obj, {showHidden: true, depth: null});
  }

  this.writeAll(http_status_code, 'application/json', json);
};
http.ServerResponse.prototype.html = function(http_status_code, str) {
  if (str === undefined) {
    str = http_status_code;
    http_status_code = 200;
  }
  this.writeAll(http_status_code, 'text/html', str);
};
http.ServerResponse.prototype.text = function(http_status_code, str) {
  if (str === undefined) {
    str = http_status_code;
    http_status_code = 200;
  }
  this.writeAll(http_status_code, 'text/plain', str);
};
http.ServerResponse.prototype.empty = function(http_status_code) {
  // response.writeHead(statusCode, [reasonPhrase], [headers])
  if (http_status_code === undefined) {
    http_status_code = 200;
  }
  this.writeHead(http_status_code);
  this.end();
};
http.ServerResponse.prototype.die = function(http_status_code, err) {
  // if only one argument is specified, it must be the error string
  if (err === undefined) {
    err = http_status_code;
    http_status_code = 500;
  }
  var body = err ? 'Failure: ' + err.toString() : 'Failure';
  this.writeAll(http_status_code, 'text/plain', body);
};
http.ServerResponse.prototype.redirect = function(http_status_code, location) {
  // if only one argument is specified, it must be the location
  if (location === undefined) {
    location = http_status_code;
    http_status_code = 302;
  }
  this.writeHead(http_status_code, {'Location': location});
  this.write('Redirecting to: ' + location);
  this.end();
};

module.exports = http;

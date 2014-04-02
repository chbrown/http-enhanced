/*jslint node: true */ /*globals setImmediate */
var http = require('http');
var querystring = require('querystring');
var url = require('url');

function _serialize(object) {
  try {
    return JSON.stringify(object);
  }
  catch (exc) {
    return JSON.stringify('JSON serialization error: ' + exc.toString());
  }
}

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
http.ServerResponse.prototype.status = function(http_status_code) {
  this.statusCode = http_status_code;
  return this;
};
http.ServerResponse.prototype.ngjson = function(object) {
  // angular.js style protection
  this.setHeader('Content-Type', 'application/json');
  this.end(")]}',\n" + _serialize(object));
  return this;
};
http.ServerResponse.prototype.xjson = function(object) {
  // this is how facebook does it, which is similar to how google does it (with 'while(1);')
  // I've also seen 'throw 1;' and '%%%BREAK%%%'
  this.setHeader('Content-Type', 'application/x-javascript');
  this.end('for (;;);' + _serialize(object));
  return this;
};
http.ServerResponse.prototype.json = function(object) {
  this.setHeader('Content-Type', 'application/json');
  this.end(_serialize(object));
  return this;
};
http.ServerResponse.prototype.html = function(body) {
  this.setHeader('Content-Type', 'text/html');
  this.end(body);
  return this;
};
http.ServerResponse.prototype.text = function(body) {
  this.setHeader('Content-Type', 'text/plain');
  this.end(body);
  return this;
};
http.ServerResponse.prototype.die = function(error) {
  if (this.statusCode == 200) {
    // only reset an OK
    this.statusCode = 500;
  }
  return this.text(error ? 'Failure: ' + error.toString() : 'Failure');
};
http.ServerResponse.prototype.redirect = function(location) {
  if (this.statusCode == 200) {
    // only set the statusCode if it's the default
    // so, you would write res.status(307).redirect(url) if you want something besides 302
    this.statusCode = 302;
  }
  this.setHeader('Location', location);
  this.end('Redirecting to: ' + location);
  return this;
};

module.exports = http;

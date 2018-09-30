const tap = require('tap')
const request = require('request')

tap.test('require should substantiate', (t) => {
  const http = require('../')
  t.ok(http, 'http should load from index.js in parent directory')
  t.end()
})

const http = require('..')

const handler = function(req, res) {
  if (req.url == '/empty') {
    res.status(204).end()
  }
  else if (req.url == '/sample.ngjson') {
    res.ngjson({name: 'Chris'})
  }
  else if (req.url == '/sample.xjson') {
    res.xjson({name: 'Chris'})
  }
  else if (req.url == '/sample.json') {
    res.json({name: 'Chris'})
  }
  else if (req.url == '/body.html') {
    res.html('<h1>Hello tests!</h1>')
  }
  else if (req.url == '/plain.txt') {
    res.text('Hello test suite.')
  }
  else if (req.url == '/relocator') {
    res.redirect('/elsewhere')
  }
  else if (req.url == '/input') {
    req.readToEnd('utf8', (err, body) => {
      res.text(body.length.toString())
    })
  }
  else if (req.url == '/extract-id') {
    req.readData((err, data) => {
      res.text(data.id.toString())
    })
  }
  else if (req.url == '/extract-title') {
    req.readData((err, data) => {
      res.text(data.title)
    })
  }
  else {
    res.die('Not found, dammit!')
  }
}

tap.test('basic server', (t) => {
  t.plan(21)

  const hostname = '127.0.0.1'
  // port = 0 finds random free port
  const server = http.createServer(handler).listen(0, hostname, () => {
    // server running, ready to run tests
    const port = server.address().port
    const addrport = 'http://' + hostname + ':' + port

    request.get(addrport + '/empty', (err, res, body) => {
      t.equal(res.statusCode, 204)
      t.equal(body, '')
    })

    request.get(addrport + '/sample.ngjson', (err, res, body) => {
      t.equal(res.headers['content-type'], 'application/json')
      t.equal(res.statusCode, 200)
      t.equal(body, ')]}\',\n{"name":"Chris"}')
    })

    request.get(addrport + '/sample.xjson', (err, res, body) => {
      t.equal(res.statusCode, 200)
      t.equal(body, 'for (;;);{"name":"Chris"}')
    })

    request.get(addrport + '/body.html', (err, res, body) => {
      t.equal(res.headers['content-type'], 'text/html')
      t.equal(body, '<h1>Hello tests!</h1>')
    })

    request.get(addrport + '/plain.txt', (err, res, body) => {
      t.equal(res.headers['content-type'], 'text/plain')
      t.equal(body, 'Hello test suite.')
    })

    request.get(addrport + '/null-and-void', (err, res, body) => {
      t.equal(res.statusCode, 500)
      t.equal(body, 'Failure: Not found, dammit!')
    })

    request.get(addrport + '/relocator', {followRedirect: false}, (err, res, body) => {
      t.equal(res.statusCode, 302)
      t.equal(body, 'Redirecting to: /elsewhere')
    })

    const input_body = 'This is only a test, so chill.'
    request.post(addrport + '/input', {body: input_body}, (err, res, body) => {
      t.equal(res.statusCode, 200)
      t.equal(body, input_body.length.toString())
    })

    const extract = {id: 'king', title: 'tortuga'}
    request.post(addrport + '/extract-id', {form: extract}, (err, res, body) => {
      t.equal(res.statusCode, 200)
      t.equal(body, 'king')
    })

    request.post(addrport + '/extract-title', {json: extract}, (err, res, body) => {
      t.equal(res.statusCode, 200)
      t.equal(body, 'tortuga')
    })
  })

  t.tearDown(() => {
    server.close()
  })
})

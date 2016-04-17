var NewsChain = require('./newschain')

var newsChain = new NewsChain(process.argv[2] || 6881, process.argv[3] || 1234)

var express = require('express')
var jsonStringifyStream = require('streaming-json-stringify')
var map = require('through2-map')

var Chance = require('chance')
var chance = new Chance()

var app = express()

app.get('/', (req, res) => {
  newsChain.add(req.query.add)
  .then((hash) => {
    res.end(hash)
  })
})

app.get('/load', (req, res) => {
  var loadCount = req.query.count || 5000

  for (var i = 0; i < loadCount; i++) {
    newsChain.add(chance.paragraph() + '\n' + chance.paragraph() + '\n' + chance.paragraph() + '\n' + chance.paragraph() + '\n' + chance.paragraph())
  }
})

app.get('/get/:id', (req, res) => {
  newsChain.get(req.params.id)
    .then((value) => {
      res.end(JSON.stringify(value))
    })
    .catch((err) => {
      res.status(500).end(err)
    })
})

app.get('/get', (req, res) => {
  var stream = newsChain.getHeadsStream()
  stream.on('error', (err) => console.log(err))
  stream
  .pipe(map.obj((node) => {
      node.value = node.value.toString()
      return node
  }))
  .pipe(jsonStringifyStream())
  .pipe(res)
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})

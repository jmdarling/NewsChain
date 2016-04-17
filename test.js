var NewsChain = require('./newschain')

var newsChain = new NewsChain(process.argv[2] || 6881, process.argv[3] || 1234)

var express = require('express')
var app = express()

// Promise.all([
//   newsChain.add(process.argv[4] || 'test1'),
//   newsChain.add(process.argv[5] || 'test2'),
//   newsChain.add(process.argv[6] || 'test3')
// ])
// .then((keys) => {
//   return Promise.all(
//     keys.map((key) => newsChain.get(key))
//   )
// })
// .then((values) => {
//   console.log('Values returned:', values.join(', '))
// })

app.get('/', function (req, res) {
  newsChain.add(req.query.add)
  .then((hash) => {
    res.end(hash)
  })
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})

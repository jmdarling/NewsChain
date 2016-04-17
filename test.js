var NewsChain = require('./newschain')

var newsChain = new NewsChain(process.argv[2] || 6881, process.argv[3] || 1234)

Promise.all([
  newsChain.add(process.argv[4] || 'test1'),
  newsChain.add(process.argv[5] || 'test2'),
  newsChain.add(process.argv[6] || 'test3')
])
.then((keys) => {
  return Promise.all(
    keys.map((key) => newsChain.get(key))
  )
})
.then((values) => {
  console.log('Values returned:', values.join(', '))
})

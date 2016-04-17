'use strict'

var hyperlog = require('hyperlog')
var levelup = require('levelup')
var Swarm = require('discovery-swarm')
var net = require('net')

function getAddress (socket) {
  return socket.remoteAddress + ':' + socket.remotePort
}

/**
 * Initialize the Merkel DAG service.
 * @param  {Number} port The port to listen for updates at.
 */
var NewsChain = function (port) {
  this.port = port || 1234

  // Initialize the database.
  this.db = levelup('newschain', {
    db: require('memdown')
  })

  // Initialize hyperlog logger.
  this.log = hyperlog(this.db)
  this.log.on('add', (node) => console.log('Added node:', node.key, '->', node.value.toString()))

  var sw = Swarm()

  sw.listen(port)
  sw.join('NewsChain')
  console.log('Listening to NewsChain swarm on port', this.port)

  sw.on('connection', function (socket) {
    console.log('Connected to', getAddress(socket))
    socket.on('error', (err) => {
        console.error(`Socket error${getAddress(socket)}:`, err)
        replicatedLogSocket.destroy()
    })

    var replicatedLogSocket = this.log.replicate({live: true})
    replicatedLogSocket.pipe(socket).pipe(replicatedLogSocket)
    replicatedLogSocket.on('error', (err) => {
      console.error('Log replication error:', err)
      socket.destroy()
    })
  })
}

/**
 * Adds an entry to the NewsChain.
 * @param {String}           value The value to add to the NewsChain.
 * @param {String|undefined} link  Optional link to a parent value.
 */
NewsChain.prototype.add = function (value, link) {
  if (!value) {
    return Promise.reject('Value is required')
  }

  // Add the value to the Merkle DAG.
  return new Promise((resolve, reject) => {
    this.log.add(link || null, value, (err, node) => {
      if (err) return reject(err)
      resolve(node.key)
    })
  })
}

/**
 * Gets a value by its key.
 * @param  {string}   key      The key for the value.
 */
NewsChain.prototype.get = function (key) {
  if (!key) {
    return Promise.reject('No key/hash provided')
  }

  return new Promise((resolve, reject) => {
    this.log.get(key, null, (err, node) => {
      if (err) return reject(err)
      resolve(node.value.toString())
    })
  })
}

/**
 * Gets a list of all head nodes.
 * @param  {Function} callback Callback function with the nodeList as the arg.
 */
NewsChain.prototype.getHeads = function () {
  return new Promise((resolve, reject) => {
    this.log.heads(null, (err, nodes) => {
      if (err) return reject(err)
      resolve(nodes)
    })
  })
}

/**
 * Returns a stream of all heads
 * @param  {Function} callback Callback function with the nodeList as the arg.
 */
NewsChain.prototype.getHeadsStream = function () {
  return this.log.heads()
}

module.exports = NewsChain

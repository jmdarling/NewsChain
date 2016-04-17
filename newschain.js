'use strict'

var hyperlog = require('hyperlog')
var levelup = require('levelup')
var net = require('net')

var DHT = require('./dht')

function getAddress (socket) {
  return socket.remoteAddress + ':' + socket.remotePort
}

/**
 * Initialize the Merkel DAG service.
 * @param  {Number} port The port to listen for updates at.
 */
module.exports = function (dhtPort, hyperlogPort) {
  var port = hyperlogPort || 1234

  // Initialize the database.
  var db = levelup('newschain', {
    db: require('memdown')
  })

  // Initialize hyperlog logger.
  var log = hyperlog(db)
  log.on('add', (node) => console.log('Added node:', node.key, '->', node.value.toString()))

  var dht

  // Initialize the list of peers to update / retrieve updates from.
  var peers = [] // TODO: Populate this list with Ratah's thing.

  var connections = {}

  // Listen for connections that will trigger updates to the Merkle DAG.
  net.createServer(function (socket) {
    console.log('Received connection from ', getAddress(socket))
    connections[getAddress(socket)] = socket

    socket.on('close', () => {
      console.log('Disconnected from ', getAddress(socket))
      delete connections[getAddress(socket)]
    })

    socket.on('error', (err) => {
      console.error('Disconnected due to error from', getAddress(socket))
      console.error(err)
      delete connections[getAddress(socket)]
    })

    var replicatedLogSocket = log.replicate({live: true})
    replicatedLogSocket.pipe(socket).pipe(replicatedLogSocket)
  }).listen(port)

  console.log(`Listening on port ${port}`)

  /**
   * Adds an entry to the NewsChain.
   * @param {String}           value The value to add to the NewsChain.
   * @param {String|undefined} link  Optional link to a parent value.
   */
  this.add = function (value, link) {
    if (!value) {
      return Promise.reject('Value is required')
    }

    // Add the value to the Merkle DAG.
    return new Promise((resolve, reject) => {
      log.add(link || null, value, (err, node) => {
        if (err) return reject(err)
        this.updatePeers()
        .catch((err) => {
          console.error(err)
        })
        resolve(node.key)
      })
    })
  }

  /**
   * Gets a value by its key.
   * @param  {string}   key      The key for the value.
   */
  this.get = function (key) {
    if (!key) {
      return Promise.reject('No key/hash provided')
    }

    return new Promise((resolve, reject) => {
      log.get(key, null, function (err, node) {
        if (err) return reject(err)
        resolve(node.value.toString())
      })
    })
  }

  /**
   * Gets a list of all head nodes.
   * @param  {Function} callback Callback function with the nodeList as the arg.
   */
  this.getHeads = function () {
    return new Promise((resolve, reject) => {
      log.heads(null, function (err, nodes) {
        if (err) return reject(err)
        resolve(nodes)
      })
    })
  }

  this.updatePeers = function () {
    var promise = Promise.resolve(dht)
    if (!dht) {
      promise = DHT.createDHTNode(dhtPort, port)
    }

    return promise.then((dhtNode) => {
      dht = dhtNode
      return DHT.getPeers(dht)
    })
    .then((peerList) => {
      console.log('got peers', peerList)
      peers = peerList

      peers
      .filter((peer) => !connections[peer.host + ':' + peer.port])
      .forEach((peer) => {
        var socket = new net.Socket()
        socket.connect({
          host: peer.host,
          port: peer.port
        })

        socket.on('connect', () => {
          console.log('Connected to', getAddress(socket))
          connections[getAddress(socket)] = socket
        })
        socket.on('close', () => {
          console.log('Disconnected from', getAddress(socket))
          delete connections[getAddress(socket)]
        })
        socket.on('error', (err) => {
          console.error('Disconnected due to error from', getAddress(socket))
          console.error(err)
          delete connections[getAddress(socket)]
        })

        var replicatedLogSocket = log.replicate({live: true})
        replicatedLogSocket.pipe(socket).pipe(replicatedLogSocket)
      })
    })
  }
}

const uuid = require('uuid')
const localCache = require('./cache')
const { addMeHandler,
    adjudicationHandler,
    counterOfferHandler,
    pingHandler,
    proposalHandler,
    acceptHandler,
    proposalResolvedHandler,
    fulfillmentHandler,
    informHandler,
    settlementInitiatedHandler,
    signatureRequiredHandler,
    rulingHandler } = require('./message')

const getDirectoryFromBootNodes = require('./boot')
const hostConfiguration = require('./config/config')
const thisAddress = hostConfiguration.address + ':' + hostConfiguration.port
const clientio = require('socket.io-client')
const logger = require('./logging')

const timeStamp = new Date()
timeStamp.toISOString()

clientio.peers = []
let connectRunning = false

const connectToPeer = (peerAddress, addMeUUID) => {
    logger.info('attempting to connect to: ' + peerAddress)
    let promise = new Promise((resolve, reject) => {
        let peerSocket = clientio.connect('http://' + peerAddress, { forcenew: true, reconnection: false, timeout: 5000 })
        peerSocket.on('connect', (socket) => {
            logger.info('connected to ' + peerAddress + ` on ${timeStamp}`)
            peerSocket.emit('addMe', { address: thisAddress, addMeTTL: hostConfiguration.addMeTTL, uuid: addMeUUID })
            peerSocket.on('addMe', (message) => {
                if (addMeHandler(message)) {
                    connectToPeers()
                }
            })
            peerSocket.on('testPing', pingHandler)
            peerSocket.on('proposal', proposalHandler)
            peerSocket.on('counterOffer', counterOfferHandler)
            peerSocket.on('accept', acceptHandler)
            peerSocket.on('resolved', proposalResolvedHandler)
            peerSocket.on('fulfillment', fulfillmentHandler)
            peerSocket.on('inform', informHandler)
            peerSocket.on('settlementInitiated', settlementInitiatedHandler)
            peerSocket.on('signatureRequired', signatureRequiredHandler)
            peerSocket.on('adjudicate', adjudicationHandler)
            peerSocket.on('ruling', rulingHandler)

            peerSocket.peerAddress = peerAddress
            resolve(peerSocket)
        })
        peerSocket.on('connect_error', (error) => {
            reject('unable to connect to peer: ' + error)
        })
        peerSocket.on('disconnect', (socket) => {
            clientio.peers = clientio.peers.filter((peer) => { return peer !== peerSocket })
            connectToPeers()
        })
    })
    return promise
}

const connectToPeers = async () => {
    if (connectRunning || (clientio.peers.length === hostConfiguration.outboundCount)) {
        return
    }
    connectRunning = true
    let addMeUUID = uuid()

    let directory = localCache.getKey('directory')
    if (!directory) {
        directory = await getDirectoryFromBootNodes(clientio, hostConfiguration.bootNodes.filter(address => address !== thisAddress))
    }

    if (!directory) {
        connectRunning = false
        throw ('directory is unavailable')
    } else {
        localCache.setKey('directory', directory)
        localCache.save()
    }

    let peerDirectory = directory.filter(address => address !== thisAddress)

    //filter out the addresses of peers that are already connected
    clientio.peers.forEach((peer) => {
        peerDirectory = peerDirectory.filter(address => address !== peer.peerAddress)
    })

    while (peerDirectory.length && (clientio.peers.length < hostConfiguration.outboundCount)) {
        let peerIndex = Math.floor(Math.random() * peerDirectory.length)
        try {
            let peer = await connectToPeer(peerDirectory[peerIndex], addMeUUID)
            clientio.peers.push(peer)
        } catch (e) {
            logger.warn('error connecting to peer: ' + e)
        }
        peerDirectory = peerDirectory.filter(address => address !== peerDirectory[peerIndex])
    }
    connectRunning = false
}
module.exports = connectToPeers

jest.mock('../../src/consumer/messageTracker')
jest.mock('../../src/encrypt')
jest.mock('../../src/consumer/clientLogging')
jest.mock('../../src/consumer/proposalHelper')
jest.mock('../../src/cache')

const { messageSeen } = require('../../src/consumer/messageTracker')
const { decryptMessage, verifyMessage } = require('../../src/encrypt')
const { proposalResolvedWithAcceptance } = require('../../src/consumer/proposalHelper')
const logger = require('../../src/consumer/clientLogging')
const config = require('../../src/config/config')
const cache = require('../../src/cache')

const { consumerProposalHandler,
    consumerProposalResolvedHandler,
    consumerAddMeHandler,
    consumerCounterOfferHandler,
    consumerAcceptHandler,
    consumerFulfillmentHandler,
    consumerSettlementInitiatedHandler,
    consumerFinalDisburseHandler,
    consumerAdjudicationHandler,
    consumerRulingHandler,
    consumerSignatureRequiredHandler } = require('../../src/consumer/consumerMessageHandler')

let publicKey = Buffer.from('public', 'hex')
let privateKey = Buffer.from('private', 'hex')
let keys = { publicKey, privateKey }

beforeEach(() => {
    messageSeen.mockClear()
    decryptMessage.mockClear()
    verifyMessage.mockClear()
    logger.warn.mockClear()
    cache.getKey.mockClear()
    cache.setKey.mockClear()
    cache.save.mockClear()
    proposalResolvedWithAcceptance.mockClear()
})

test('consumerProposalHandler rejects messages with a bad signature', async () => {
    //Assemble
    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }
    const proposals = new Map()
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    //Action
    await consumerProposalHandler(proposal, proposals, keys)

    //Assert
    expect(proposals.size).toEqual(0)
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toEqual("Couldn't verify message signature on inbound proposal")
})

test('consumerProposalHandler adds proposal to data model when not seen', async () => {
    //Assemble
    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }
    const proposals = new Map()
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    //Action
    await consumerProposalHandler(proposal, proposals, keys)

    //Assert
    expect(proposals.get('abc123')).toBe(proposal)
})

test('consumerProposalHandler does not add proposal to data model when seen', async () => {
    //Assemble
    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }
    const proposals = new Map()
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(true)

    //Action
    await consumerProposalHandler(proposal, proposals, keys)

    //Assert
    expect(proposals.size).toEqual(0)
})

test('consumerProposalHandler rejects proposals with an existing id', async () => {
    //Assemble
    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    //Action
    await consumerProposalHandler(proposal, proposals, keys)

    //Assert
    expect(proposals.size).toEqual(1)
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toEqual("A proposal with that requestId already exists.")
})

test('consumerProposalResolvedHandler adds resolution to the data model', async () => {
    //Assemble
    config.consumerId = 'makerId'

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const resolution = {
        'uuid': 'someid',
        'body': {
            'makerId': 'makerId',
            'takerId': 'takerId',
            'requestId': 'abc123'
        }
    }

    const proposals = new Map()
    proposals.set('abc123', proposal)

    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    //Action
    await consumerProposalResolvedHandler(resolution, proposals)

    //Assert
    expect(proposal.resolution).toBe(resolution)
})

test('consumerProposalResolvedHandler handles bad signature', async () => {
    //Assemble
    config.consumerId = 'makerId'

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const resolution = {
        'uuid': 'someid',
        'body': {
            'makerId': 'makerId',
            'takerId': 'takerId',
            'requestId': 'abc123'
        }
    }

    const proposals = new Map()
    proposals.set('abc123', proposal)

    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    //Action
    await consumerProposalResolvedHandler(resolution, proposals)

    //Assert
    expect(proposal.resolution).toBe(undefined)
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toEqual("Couldn't verify message signature on inbound proposal resolution")
})

test('consumerProposalResolvedHandler rejects resolution for proposals not in data model', async () => {
    //Assemble
    config.consumerId = 'makerId'

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'cde123'
        }
    }

    const resolution = {
        'uuid': 'someid',
        'body': {
            'makerId': 'makerId',
            'takerId': 'takerId',
            'requestId': 'abc123'
        }
    }

    const proposals = new Map()
    proposals.set('cde123', proposal)

    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    //Action
    await consumerProposalResolvedHandler(resolution, proposals)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toEqual("Unable to find proposal for inbound proposal resolution")
})

test('consumerProposalResolvedHandler adds removes proposal when you are not the maker or taker', async () => {
    //Assemble
    config.consumerId = 'Bill'

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const resolution = {
        'uuid': 'someid',
        'body': {
            'makerId': 'makerId',
            'takerId': 'takerId',
            'requestId': 'abc123'
        }
    }

    const proposals = new Map()
    proposals.set('abc123', proposal)

    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    //Action
    await consumerProposalResolvedHandler(resolution, proposals)

    //Assert
    expect(proposals.get('abc123')).toBe(undefined)
})

test('consumerAddMeHandler adds peer to local directory', () => {
    //Assemble
    const directory = []
    const peerMessage = {
        'uuid': 'someid',
        'address': 'someaddress'
    }

    cache.getKey.mockReturnValue(directory)

    //Action
    consumerAddMeHandler(peerMessage)

    //Assert
    expect(cache.getKey).toBeCalled()
    expect(cache.getKey.mock.calls[0][0]).toMatch('directory')
    expect(cache.setKey).toBeCalled()
    expect(cache.setKey.mock.calls[0][0]).toMatch('directory')
    expect(cache.setKey.mock.calls[0][1]).toBe(directory)
    expect(cache.save).toBeCalled()
    expect(directory.includes('someaddress')).toBeTruthy()
})

test('consumerAddMeHandler does not add duplicate addresses', () => {
    //Assemble
    const directory = ['someaddress']
    const expected = ['someaddress']
    const peerMessage = {
        'uuid': 'someid',
        'address': 'someaddress'
    }

    cache.getKey.mockReturnValue(directory)

    //Action
    consumerAddMeHandler(peerMessage)

    //Assert
    expect(cache.getKey).toBeCalled()
    expect(cache.getKey.mock.calls[0][0]).toMatch('directory')
    expect(cache.setKey).not.toBeCalled()
    expect(cache.save).not.toBeCalled()
    expect(directory).toEqual(expected)
})

test('consumerCounterOfferHandler handles bad signature', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'counterOffers': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)

    //Action
    await consumerCounterOfferHandler(peerMessage, proposals, keys)

    //Assert
    expect(proposal.counterOffers.length).toEqual(0)
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to process inbound counter offer: Error: Couldn't verify message signature")
})

test('consumerCounterOfferHandler rejects counter offers for proposals not in the data model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'cde123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'counterOffers': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)

    //Action
    await consumerCounterOfferHandler(peerMessage, proposals, keys)

    //Assert
    expect(decryptMessage).toBeCalled()
    expect(proposal.counterOffers.length).toEqual(0)
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("Unable to locate original proposal for inbound counter offer")
})

test('consumerCounterOfferHandler adds to the data model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'counterOffers': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)

    //Action
    await consumerCounterOfferHandler(peerMessage, proposals, keys)

    //Assert
    expect(decryptMessage).toBeCalled()
    expect(proposal.counterOffers.length).toEqual(1)
    expect(proposal.counterOffers[0]).toBe(decryptedMessage)
})

test('consumerAcceptHandler rejects bad signatures', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerAcceptHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to process inbound acceptance: Error: Couldn't verify message signature")
})

test('consumerAcceptHandler rejects acceptances for proposal not in the data model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'cde123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerAcceptHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("Unable to locate original proposal for inbound acceptance")
    expect(proposal.acceptances.length).toEqual(0)
})

test('consumerAcceptHandler adds to data model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerAcceptHandler(peerMessage, proposals, keys)

    //Assert
    expect(proposal.acceptances.length).toEqual(1)
    expect(proposal.acceptances[0]).toBe(decryptedMessage)
})

test('consumerFulfillmentHandler rejects bad signatures', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerFulfillmentHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to process inbound fulfillment: Error: Couldn't verify message signature")
})

test('consumerFulfillmentHandler rejects proposals that did not resolve with an acceptance', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)
    proposalResolvedWithAcceptance.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': [],
        'fulfillments': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerFulfillmentHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to locate proposal that resolved with acceptance for inbound fulfillment")
    expect(proposal.fulfillments.length).toEqual(0)
})

test('consumerFulfillmentHandler adds to data model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)
    proposalResolvedWithAcceptance.mockReturnValue(true)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const acceptance = {
        'uuid': 'someid',
        'body': {
            'takerId': 'ricky',
            'makerId': 'lucy'
        }
    }
    const resoluntion = {
        'uuid': 'someid',
        'body': {
            'takerId': 'ricky',
            'makerId': 'lucy'
        }
    }

    const proposal = {
        'uuid': 'someid',
        'body': {
            'makerId': 'lucy'
        },
        'acceptances': [acceptance],
        'fulfillments': [],
        'resolution': resoluntion
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerFulfillmentHandler(peerMessage, proposals, keys)

    //Assert
    expect(proposal.fulfillments.length).toEqual(1)
    expect(proposal.fulfillments[0]).toBe(decryptedMessage)
})

test('consumerSettlementInitiatedHandler rejects bad signatures', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerSettlementInitiatedHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to process inbound settlementInitiated: Error: Couldn't verify message signature")
})

test('consumerSettlementInitiated rejects proposals that did not resolve with an acceptance', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)
    proposalResolvedWithAcceptance.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': [],
        'fulfillments': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerSettlementInitiatedHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to locate proposal that resolved with acceptance for inbound settlementInitiated")
    expect(proposal.fulfillments.length).toEqual(0)
})

test('consumerSettlementInitiated adds to data model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)
    proposalResolvedWithAcceptance.mockReturnValue(true)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const acceptance = {
        'uuid': 'someid',
        'body': {
            'takerId': 'ricky',
            'makerId': 'lucy'
        }
    }
    const resoluntion = {
        'uuid': 'someid',
        'body': {
            'takerId': 'ricky',
            'makerId': 'lucy'
        }
    }

    const proposal = {
        'uuid': 'someid',
        'body': {
            'makerId': 'lucy'
        },
        'acceptances': [acceptance],
        'fulfillments': [],
        'resolution': resoluntion
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerSettlementInitiatedHandler(peerMessage, proposals, keys)

    //Assert
    expect(proposal.settlementInitiated).toBe(decryptedMessage)
})

test('consumerFinalDisburseHandler rejects bad signatures', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerFinalDisburseHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to process inbound disbursed: Error: Couldn't verify message signature")
})

test('consumerFinalDisburseHandler rejects proposals that did not resolve with an acceptance', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)
    proposalResolvedWithAcceptance.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': [],
        'fulfillments': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerFinalDisburseHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to locate proposal that resolved with acceptance for inbound disbursed")
    expect(proposal.disbursed).toBe(undefined)
})

test('consumerFinalDisburse adds to data model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)
    proposalResolvedWithAcceptance.mockReturnValue(true)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const acceptance = {
        'uuid': 'someid',
        'body': {
            'takerId': 'ricky',
            'makerId': 'lucy'
        }
    }
    const resoluntion = {
        'uuid': 'someid',
        'body': {
            'takerId': 'ricky',
            'makerId': 'lucy'
        }
    }

    const proposal = {
        'uuid': 'someid',
        'body': {
            'makerId': 'lucy'
        },
        'acceptances': [acceptance],
        'fulfillments': [],
        'resolution': resoluntion
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerFinalDisburseHandler(peerMessage, proposals, keys)

    //Assert
    expect(proposal.disbursed).toBe(decryptedMessage)
})

test('consumerAdjudicaitonHandler rejects bad signatures', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)


    const adjudications = new Map()
    const adjudicationsForProposal = []
    adjudications.set('abc123', adjudicationsForProposal)

    //Action
    await consumerAdjudicationHandler(peerMessage, adjudications, keys)


    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to process inbound adjudication: Error: Couldn't verify message signature")
})

test('consumerAdjudicaitonHandler adds to model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)


    const adjudications = new Map()
    const adjudicationsForProposal = []
    adjudications.set('abc123', adjudicationsForProposal)

    //Action
    await consumerAdjudicationHandler(peerMessage, adjudications, keys)

    //Assert
    expect(adjudicationsForProposal.length).toEqual(1)
    expect(adjudicationsForProposal[0]).toBe(decryptedMessage)
})

test('consumerRulingHandler rejects bad signatures', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const rulings = new Map()

    //Action
    await consumerRulingHandler(peerMessage, rulings, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to process inbound ruling: Error: Couldn't verify message signature")
})

test('consumerRulingHandler adds to model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const rulings = new Map()

    //Action
    await consumerRulingHandler(peerMessage, rulings, keys)

    //Assert
    expect(rulings.get('abc123')).toBe(decryptedMessage)
})

test('consumerSignatureRequiredHandler rejects bad signatures', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(false) }))
    messageSeen.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerSignatureRequiredHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to process inbound signatureRequired: Error: Couldn't verify message signature")
})

test('consumerSignatureRequired rejects proposals that did not resolve with an acceptance', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)
    proposalResolvedWithAcceptance.mockReturnValue(false)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const proposal = {
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        },
        'acceptances': [],
        'fulfillments': []
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)


    //Action
    await consumerSignatureRequiredHandler(peerMessage, proposals, keys)

    //Assert
    expect(logger.warn).toBeCalled()
    expect(logger.warn.mock.calls[0][0]).toMatch("unable to locate proposal that resolved with acceptance for inbound signatureRequired")
    expect(proposal.signatureRequired).toBe(undefined)
})

test('consumerSignatureRequired adds to data model', async () => {
    //Assemble
    verifyMessage.mockReturnValue(new Promise((resolve, reject) => { resolve(true) }))
    messageSeen.mockReturnValue(false)
    proposalResolvedWithAcceptance.mockReturnValue(true)

    const peerMessage = {
        'recipientKey': keys.publicKey.toString('hex'),
        'uuid': 'someid',
        'body': {
            'requestId': 'abc123'
        }
    }

    const decryptedMessage = JSON.parse(JSON.stringify(peerMessage))
    decryptMessage.mockReturnValue(decryptedMessage)

    const acceptance = {
        'uuid': 'someid',
        'body': {
            'takerId': 'ricky',
            'makerId': 'lucy'
        }
    }
    const resoluntion = {
        'uuid': 'someid',
        'body': {
            'takerId': 'ricky',
            'makerId': 'lucy'
        }
    }

    const proposal = {
        'uuid': 'someid',
        'body': {
            'makerId': 'lucy'
        },
        'acceptances': [acceptance],
        'fulfillments': [],
        'resolution': resoluntion
    }
    const proposals = new Map()
    proposals.set('abc123', proposal)

    //Action
    await consumerSignatureRequiredHandler(peerMessage, proposals, keys)

    //Assert
    expect(proposal.signatureRequired).toBe(decryptedMessage)
})

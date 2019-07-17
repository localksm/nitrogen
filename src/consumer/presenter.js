const presentOpenCases = (adjudications) => {
    console.log('Proposal request ids in dispute')
    adjudications.forEach((value, key)=> {
        console.log(key)
    });
}

const presentCounterOffers = (param, proposals) => {
    let counteredProposal = proposals.get(param)
    if (!counteredProposal) {
        throw new Error('proposal not found')
    }
    counteredProposal.counterOffers.forEach((counterOffer) => {
        console.log('---------------------------------')
        console.log('request: ' + counterOffer.body.requestId)
        console.log('taker id: ' + counterOffer.body.takerId)
        console.log('offer asset: ' + counterOffer.body.offerAsset)
        console.log('offer amount: ' + counterOffer.body.offerAmount)
        console.log('request asset: ' + counterOffer.body.requestAsset)
        console.log('request amount: ' + counterOffer.body.requestAmount)
        console.log('---------------------------------')
    })
}

const presentOfferHistory = (param, proposals) => {
    let proposal = proposals.get(param)
    if (!proposal) {
        throw new Error('proposal not found')
    }
    console.log('---------------------------------')
    console.log('Original Proposal')
    console.log('from public key: ' + proposal.publicKey.toString('hex'))
    console.log('request: ' + proposal.body.requestId)
    console.log('maker id: ' + proposal.body.makerId)
    console.log('offer asset: ' + proposal.body.offerAsset)
    console.log('offer amount: ' + proposal.body.offerAmount)
    console.log('request asset: ' + proposal.body.requestAsset)
    console.log('request amount: ' + proposal.body.requestAmount)
    console.log('---------------------------------')
    proposal.counterOffers.forEach((counterOffer) => {
        console.log('---------------------------------')
        console.log('Counter Offer')
        console.log('from public key: ' + counterOffer.publicKey.toString('hex'))
        console.log('request: ' + counterOffer.body.requestId)
        console.log('maker id: ' + counterOffer.body.makerId)
        console.log('taker id: ' + counterOffer.body.takerId)
        console.log('offer asset: ' + counterOffer.body.offerAsset)
        console.log('offer amount: ' + counterOffer.body.offerAmount)
        console.log('request asset: ' + counterOffer.body.requestAsset)
        console.log('request amount: ' + counterOffer.body.requestAmount)
        console.log('---------------------------------')
    })
    proposal.acceptances.forEach((acceptance) => {
        console.log('---------------------------------')
        console.log('Acceptance')
        console.log('from public key: ' + acceptance.publicKey.toString('hex'))
        console.log('request: ' + acceptance.body.requestId)
        console.log('maker id: ' + acceptance.body.makerId)
        console.log('taker id: ' + acceptance.body.takerId)
        console.log('offer asset: ' + acceptance.body.offerAsset)
        console.log('offer amount: ' + acceptance.body.offerAmount)
        console.log('request asset: ' + acceptance.body.requestAsset)
        console.log('request amount: ' + acceptance.body.requestAmount)
        console.log('---------------------------------')
    })
    proposal.fulfillments.forEach((fulfillment) => {
        console.log('---------------------------------')
        console.log('Fulfillment')
        console.log('from public key: ' + fulfillment.publicKey.toString('hex'))
        console.log('request: ' + fulfillment.body.requestId)
        console.log('maker id: ' + fulfillment.body.makerId)
        console.log('taker id: ' + fulfillment.body.takerId)
        console.log('message: ' + fulfillment.body.message)
        console.log('fulfullment: ' + JSON.stringify(fulfillment.body.fulfillment))
        console.log('---------------------------------')
    })
    if (proposal.resolution) {
        console.log('---------------------------------')
        console.log('Proposal resolved accepting taker id: ' + proposal.resolution.body.takerId)
        console.log('---------------------------------')
    }
    if (proposal.settlementInitiated) {
        console.log('---------------------------------')
        console.log('Settlement initiated with escrow id: ' + proposal.settlementInitiated.body.escrow)
        console.log('---------------------------------')
    }
    if (proposal.signatureRequired) {
        console.log('---------------------------------')
        console.log('The buyer issued disbursement')
        console.log('---------------------------------')
    }
}

module.exports = { presentOpenCases, presentCounterOffers, presentOfferHistory }
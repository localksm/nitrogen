
jest.mock('stellar-sdk')
const stellar = require('stellar-sdk')
const { TransactionBuilder, Operation, Network, Asset, Keypair, Transaction, xdr } = jest.requireActual('stellar-sdk')
stellar.TransactionBuilder = TransactionBuilder
stellar.Operation = Operation
stellar.Network = Network
stellar.Asset = Asset
stellar.Keypair = Keypair
const { initiateSettlement, createBuyerDisburseTransaction, createFavorBuyerTransaction, createFavorSellerTransaction } = require('../../src/consumer/chains/stellar')

//Assemble
const buyerSecret = 'SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH'
const buyerPublic = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
const platformPublic = 'GD5PN7AE3UP43LAVO7V5RQZNTCQWH23LVTA5WROE25RVF5FIMVUVQIEF'
const escrowSecret = 'SDQLRJVYLL2CUKXYPS3OSL6HPXKN2F47HTWRIRYCJJUUIJIKBVFQKTSV'
const escrowPublic = 'GAQK62EZBRINSGVCWRKOTYTK3JOLKODYLI223OMPOYOHPOXHW66XG3KQ'
const jurySecret = 'SC5LFR4I5NEYXAWIPUD5C5NWLIK65BLG2DYRWHIBP7JMVQ3D3BIUU46J'
const juryPublic = 'GDIAIGUHDGMTDLKC6KFU2DIR7JVNYI4WFQ5TWTVKEHZ4G3T47HEFNUME'
const sellerPublic = 'GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV'
const challengeStake = 10
const nativeAmount = 200
const escrowPair = stellar.Keypair.fromSecret(escrowSecret)

stellar.Keypair.random = jest.fn(function () {
    return escrowPair
})

const buyerAccount = {
    sequenceNumber: () => 1,
    accountId: () => buyerPublic,
    incrementSequenceNumber: () => { }
}

const escrowAccount = {
    sequenceNumber: () => 1,
    accountId: () => escrowPublic,
    incrementSequenceNumber: () => { }
}

const juryAccount = {
    sequenceNumber: () => 1,
    accountId: () => juryPublic,
    incrementSequenceNumber: () => { }
}

const mockLoadAccount = jest.fn(function (accountId) {
    return new Promise((resolve, reject) => {
        if (accountId === buyerPublic) {
            resolve(buyerAccount)
        }
        else if (accountId === escrowPublic) {
            resolve(escrowAccount)
        }
        else if (accountId === juryPublic) {
            resolve(juryAccount)
        }
        else {
            reject('bad account id')
        }
    })
})

const mockSubmitTransaction = jest.fn(function (transaction) {
    return new Promise((resolve, reject) => {
        resolve({})
    })
})

const mockFetchBaseFee = jest.fn(function () {
    return new Promise((resolve, reject) => {
        resolve(2)
    })
})

stellar.Server.mockImplementation((url) => {
    return { loadAccount: mockLoadAccount, submitTransaction: mockSubmitTransaction, fetchBaseFee: mockFetchBaseFee }
})

afterEach(() => {
    stellar.Server.mockClear()
})


test('initiateSettlement pulls account', async () => {
    //Action
    await initiateSettlement(buyerSecret, sellerPublic, juryPublic, challengeStake, nativeAmount)

    //Assert
    expect(mockLoadAccount).toBeCalledWith(buyerPublic)
})

test('initiateSettlement creates funded escrow', async () => {
    //Action
    await initiateSettlement(buyerSecret, sellerPublic, juryPublic, challengeStake, nativeAmount)

    //Assert
    const transaction = mockSubmitTransaction.mock.calls[0][0]
    expect(transaction.operations[0].type).toEqual('createAccount')
    expect(transaction.operations[0].destination).toEqual(escrowPublic)

    //Challenge stake is 10
    //Native amount paid is 200
    //Base is 3
    //Platform is 1
    expect(transaction.operations[0].startingBalance).toEqual('214.0000000')
})

test('initiateSettlement configures escrow', async () => {
    //Action
    await initiateSettlement(buyerSecret, sellerPublic, juryPublic, challengeStake, nativeAmount)

    //Assert
    const transaction = mockSubmitTransaction.mock.calls[1][0]
    expect(transaction.operations[0].type).toEqual('setOptions')
    expect(transaction.operations[0].masterWeight).toEqual(0)
    expect(transaction.operations[0].lowThreshold).toEqual(1)
    expect(transaction.operations[0].medThreshold).toEqual(2)
    expect(transaction.operations[0].highThreshold).toEqual(2)

    expect(transaction.operations[1].signer.ed25519PublicKey).toEqual(buyerPublic)
    expect(transaction.operations[1].signer.weight).toEqual(1)

    expect(transaction.operations[2].signer.ed25519PublicKey).toEqual(sellerPublic)
    expect(transaction.operations[2].signer.weight).toEqual(1)

    expect(transaction.operations[3].signer.ed25519PublicKey).toEqual(juryPublic)
    expect(transaction.operations[3].signer.weight).toEqual(1)
})

test('createBuyerDisburseTransactionDoes', async() => {
    //Assemble
    const amount = 100

    //Action
    const xdrTransaction = await createBuyerDisburseTransaction(buyerSecret, sellerPublic, challengeStake, amount, escrowPublic)

    //Assert
    const xdrBuffer = Buffer.from(xdrTransaction, 'base64')
    const envelope = xdr.TransactionEnvelope.fromXDR(xdrBuffer, 'base64')
    const transaction = new Transaction(envelope)
    expect(transaction.operations[0].type).toEqual('payment')
    expect(transaction.operations[0].destination).toEqual(sellerPublic)
    expect(transaction.operations[0].amount).toEqual('100.0000000')
    expect(transaction.operations[1].type).toEqual('payment')
    expect(transaction.operations[1].destination).toEqual(platformPublic)
    expect(transaction.operations[1].amount).toEqual('1.0000000')
    expect(transaction.operations[2].type).toEqual('accountMerge')
    expect(transaction.operations[2].destination).toEqual(buyerPublic)
    expect(transaction.source).toEqual(escrowPublic)
})

test('createFavorBuyerTransactionDoes', async() => {
    //Assemble

    //Action
    const xdrTransaction = await createFavorBuyerTransaction(jurySecret, escrowPublic, buyerPublic, challengeStake)

    //Assert
    const xdrBuffer = Buffer.from(xdrTransaction, 'base64')
    const envelope = xdr.TransactionEnvelope.fromXDR(xdrBuffer, 'base64')
    const transaction = new Transaction(envelope)
    expect(transaction.operations[0].type).toEqual('payment')
    expect(transaction.operations[0].destination).toEqual(juryPublic)
    expect(transaction.operations[0].amount).toEqual('10.0000000')
    expect(transaction.operations[1].type).toEqual('payment')
    expect(transaction.operations[1].destination).toEqual(platformPublic)
    expect(transaction.operations[1].amount).toEqual('1.0000000')
    expect(transaction.operations[2].type).toEqual('accountMerge')
    expect(transaction.operations[2].destination).toEqual(buyerPublic)
    expect(transaction.source).toEqual(escrowPublic)
})

test('createFavorSellerTransactionDoes', async() => {
    //Assemble

    //Action
    const xdrTransaction = await createFavorSellerTransaction(jurySecret, escrowPublic, buyerPublic, sellerPublic, challengeStake, nativeAmount)

    //Assert
    const xdrBuffer = Buffer.from(xdrTransaction, 'base64')
    const envelope = xdr.TransactionEnvelope.fromXDR(xdrBuffer, 'base64')
    const transaction = new Transaction(envelope)
    expect(transaction.operations[0].type).toEqual('payment')
    expect(transaction.operations[0].destination).toEqual(juryPublic)
    expect(transaction.operations[0].amount).toEqual('10.0000000')
    expect(transaction.operations[1].type).toEqual('payment')
    expect(transaction.operations[1].destination).toEqual(platformPublic)
    expect(transaction.operations[1].amount).toEqual('1.0000000')
    expect(transaction.operations[2].type).toEqual('payment')
    expect(transaction.operations[2].destination).toEqual(sellerPublic)
    expect(transaction.operations[2].amount).toEqual('200.0000000')
    expect(transaction.operations[3].type).toEqual('accountMerge')
    expect(transaction.operations[3].destination).toEqual(buyerPublic)
    expect(transaction.source).toEqual(escrowPublic)
})

jest.mock('../../src/consumer/chain')
jest.mock('../../src/config/config')
jest.mock('../../src/encrypt')
jest.mock('../../src/consumer/consumerPeer')
jest.mock('../../src/consumer/agreement')

const agreement = require('../../src/consumer/agreement')
const chain = require('../../src/consumer/chain')
const config = require('../../src/config/config')
const encrypt = require('../../src/encrypt')
const consumerPeer = require('../../src/consumer/consumerPeer')

consumerPeer.buildMessage.mockReturnValue({})
encrypt.encryptMessage.mockReturnValue({})
encrypt.signMessage.mockReturnValue({})
chain.initiateSettlement.mockReturnValue({ publicKey: () => 'escrowPublicKey' })

config.juryKey = 'GDIAIGUHDGMTDLKC6KFU2DIR7JVNYI4WFQ5TWTVKEHZ4G3T47HEFNUME'

const proposalsJson = '[["abc1234",{"uuid":"3b914bc5-58a7-4d13-b1f3-2eb6972f3836","publicKey":"04955cda95e98f3af8b46f4d3d5ba52bdda031984f51b657434f9d95d399b17a417ab0726076c30c4828b86b95a39c0de6b9d09d3c9b7b5d2046f22c6264ef633e","body":{"requestId":"abc1234","makerId":"GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3","offerAsset":"native","offerAmount":200,"requestAsset":"peanuts","requestAmount":100,"conditions":[],"juryPool":"ghi1234","challengeStake":100,"audience":[]},"hash":"228231d8b685ba724e132fcb94c5fabf3451c2d15b1224ad10164bbb8234fa55","signature":"3045022100f3f9ae1a24f7462f99a46e15ad84024ee7fd1c6bca76fe72297d434fe79f18f6022079c4d08f2c6075b12da3e49f4876cc0bcf3de4adb78a881814467026cc2d9f2d","counterOffers":[],"acceptances":[{"uuid":"20fa8059-8602-4a08-b383-b30e11b377f7","publicKey":"04a9238a2b56a5c5fe31553e6aa2c3677985d90b4aa635fccfdc6c8fa407eb3f6b3a3c55ef5a7c45b078e9a51fcec82e165d9aaf88147d28ca7a19718948f33782","body":{"requestId":"abc1234","makerId":"GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3","offerAsset":"native","offerAmount":200,"requestAsset":"peanuts","requestAmount":100,"conditions":[],"juryPool":"ghi1234","challengeStake":100,"audience":[],"takerId":"GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV","message":"accepted","previousHash":"228231d8b685ba724e132fcb94c5fabf3451c2d15b1224ad10164bbb8234fa55"},"recipientKey":"04955cda95e98f3af8b46f4d3d5ba52bdda031984f51b657434f9d95d399b17a417ab0726076c30c4828b86b95a39c0de6b9d09d3c9b7b5d2046f22c6264ef633e","hash":"93b5e4e59d588cb4c2af502a937f5f18986031c7947ea0f4df3d18b4e2584426","signature":"3044022075612f48e957959cf81d3eebcae23544365408f48375b80f6e9c293020fb9c6e0220354a44eb550c03600341521742c8242368f71e6055794a87e1d2128c5e119d8a"}],"fulfillments":[],"resolution":{"uuid":"e3cdba78-1673-4587-968a-cf885962c272","publicKey":"04955cda95e98f3af8b46f4d3d5ba52bdda031984f51b657434f9d95d399b17a417ab0726076c30c4828b86b95a39c0de6b9d09d3c9b7b5d2046f22c6264ef633e","body":{"requestId":"abc1234","makerId":"GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3","takerId":"GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV","message":"resolved","previousHash":"228231d8b685ba724e132fcb94c5fabf3451c2d15b1224ad10164bbb8234fa55"},"hash":"8f24bad33aa2a5afc234d70babd4ddef5d99a629277bf08c4c671042ed0eccf9","signature":"3045022100eaaabcc22390256c0e3f1def43fea555227ddbf647e6de2d1b8a8c2579da5dcb02203a7cdd8317bb6a7cda5db2296e2300dc4ee4f0b360dca740bb25df0b20c73460"}}]]'
const proposals = new Map(JSON.parse(proposalsJson))

const takerBuyerProposalsJson = '[["abc1234",{"uuid":"ac86f5f2-02ff-45d9-972a-c622362b963d","publicKey":"0413e8ec78f2aa667b33ada471a677a9f41cb12a08a976d493351b93c08506ef7aa84f28338f820114998ed6a0c3c5a96c44cc50799443754ec03e49e8cc33e06f","body":{"requestId":"abc1234","makerId":"GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3","offerAsset":"peanuts","offerAmount":100,"requestAsset":"native","requestAmount":200,"conditions":[],"juryPool":"ghi1234","challengeStake":100,"audience":[]},"hash":"b3c743e72d6ab472a99a324254b9f89f569bba8263d073152f55607ed012f04a","signature":"3044022001458a8f3fcc0f7c1e49cd158ec03eb8b004d5c18e921bf7c2f542c2ccece5e3022042219f16741786dff9e7a04e2ff0197bb738b17633f23ccfd5c8db902a635558","counterOffers":[],"acceptances":[{"uuid":"ca969182-dc10-48e0-b79e-d3d5cdb33499","publicKey":"04ed14e725a46c966c377911ad77a58192a83c8055c63ad55c46f44194baa18f7b616918602d86cfa0e1fceb02b6d3a4b7956f14e00b77b9ac249eabce61372a78","body":{"requestId":"abc1234","makerId":"GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3","offerAsset":"peanuts","offerAmount":100,"requestAsset":"native","requestAmount":200,"conditions":[],"juryPool":"ghi1234","challengeStake":100,"audience":[],"takerId":"GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV","message":"accepted","previousHash":"b3c743e72d6ab472a99a324254b9f89f569bba8263d073152f55607ed012f04a"},"recipientKey":"0413e8ec78f2aa667b33ada471a677a9f41cb12a08a976d493351b93c08506ef7aa84f28338f820114998ed6a0c3c5a96c44cc50799443754ec03e49e8cc33e06f","hash":"12708c2b91133312b5d6c5e04a19fbf5443986dfc07c5c9ed8bb8f8d9554b72c","signature":"3044022019a0b5de32d569648699d202609d9345ca7ad044ab40fc51fb32023d8e4ede5d022007cb4878b79d2f82931986c6a5c4704b48a6db80b04b52738e209313ece8023b"}],"fulfillments":[],"resolution":{"uuid":"4f316ce4-55c2-46b5-b60d-e4a553730d30","publicKey":"0413e8ec78f2aa667b33ada471a677a9f41cb12a08a976d493351b93c08506ef7aa84f28338f820114998ed6a0c3c5a96c44cc50799443754ec03e49e8cc33e06f","body":{"requestId":"abc1234","makerId":"GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3","takerId":"GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV","message":"resolved","previousHash":"b3c743e72d6ab472a99a324254b9f89f569bba8263d073152f55607ed012f04a"},"hash":"60ec4936cffb900f03ae4f53be2e5711437df57cc1a0041c406bfd7550106439","signature":"30440220555af54128ea2cbd628170f1f6b9fc40fa559c596c1bca7c620ba46b767642bc022008c7f90210d99d0303bcb2177cd178a6c6f51191b65172e1ec2afb3e34a3c6fd"}}]]'
const takerBuyerProposals = new Map(JSON.parse(takerBuyerProposalsJson))

const publicKey = new Buffer('public')
const privateKey = new Buffer('private')
const keys = { publicKey, privateKey }


afterEach(() => {
    chain.initiateSettlement.mockClear()
    agreement.validateAgreement.mockClear()
})

const { processSettleProposal, processValidateAgreement } = require('../../src/consumer/commandProcessor')

test('processSettleProposal calls initiateSettlement on chain when proposal is resolved (taker as buyer)', async () => {
    //Assemble
    config.consumerId = 'GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV'
    const settlementJson = '{ "requestId" : "abc1234", "secret" : "SDN5W3B2RSO4ZHVCY3EXUIZQD32JDWHVDBAO5A3FBUF4BPQBZZ3ST6IT"}'
    const buyerSecret = 'SDN5W3B2RSO4ZHVCY3EXUIZQD32JDWHVDBAO5A3FBUF4BPQBZZ3ST6IT'
    const juryPublic = 'GDIAIGUHDGMTDLKC6KFU2DIR7JVNYI4WFQ5TWTVKEHZ4G3T47HEFNUME'
    const sellerPublic = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
    const challengeStake = 100
    const requestAmount = 200

    //Action
    await processSettleProposal(settlementJson, takerBuyerProposals, keys)

    //Assert
    expect(chain.initiateSettlement).toBeCalled()
    expect(chain.initiateSettlement.mock.calls[0][0]).toEqual(buyerSecret)
    expect(chain.initiateSettlement.mock.calls[0][1]).toEqual(sellerPublic)
    expect(chain.initiateSettlement.mock.calls[0][2]).toEqual(juryPublic)
    expect(chain.initiateSettlement.mock.calls[0][3]).toEqual(challengeStake)
    expect(chain.initiateSettlement.mock.calls[0][4]).toEqual(requestAmount)
})

test('processSettleProposal does not call initiateSettlement on chain when caller is not the buyer (taker as buyer)', async () => {
    //Assemble
    config.consumerId = 'GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV'
    const settlementJson = '{ "requestId" : "abc1234", "secret" : "SDN5W3B2RSO4ZHVCY3EXUIZQD32JDWHVDBAO5A3FBUF4BPQBZZ3ST6IT"}'
    const buyerSecret = 'SDN5W3B2RSO4ZHVCY3EXUIZQD32JDWHVDBAO5A3FBUF4BPQBZZ3ST6IT'
    const juryPublic = 'GDIAIGUHDGMTDLKC6KFU2DIR7JVNYI4WFQ5TWTVKEHZ4G3T47HEFNUME'
    const sellerPublic = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
    const challengeStake = 100
    const requestAmount = 200

    //Action
    try {
        await processSettleProposal(settlementJson, proposals, keys)
    } catch (e) {
        //noop
    }

    //Assert
    expect(chain.initiateSettlement).not.toBeCalled()
})

test('processSettleProposal throws an error when caller is not the buyer (taker as buyer)', async () => {
    //Assemble
    config.consumerId = 'GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV'
    const settlementJson = '{ "requestId" : "abc1234", "secret" : "SDN5W3B2RSO4ZHVCY3EXUIZQD32JDWHVDBAO5A3FBUF4BPQBZZ3ST6IT"}'
    const buyerSecret = 'SDN5W3B2RSO4ZHVCY3EXUIZQD32JDWHVDBAO5A3FBUF4BPQBZZ3ST6IT'
    const juryPublic = 'GDIAIGUHDGMTDLKC6KFU2DIR7JVNYI4WFQ5TWTVKEHZ4G3T47HEFNUME'
    const sellerPublic = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
    const challengeStake = 100
    const requestAmount = 200

    //Action
    try {
        await processSettleProposal(settlementJson, proposals, keys)
    } catch (e) {
        //Assert
        expect(e.message).toMatch('only party buying with lumens can initiate settlement')
    }

})

test('processSettleProposal does not call initiateSettlement on chain when caller is not the buyer', async () => {
    //Assemble
    config.consumerId = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
    const settlementJson = '{ "requestId" : "abc1234", "secret" : "SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH"}'
    const buyerSecret = 'SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH'
    const juryPublic = 'GDIAIGUHDGMTDLKC6KFU2DIR7JVNYI4WFQ5TWTVKEHZ4G3T47HEFNUME'
    const sellerPublic = 'GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV'
    const challengeStake = 100
    const offerAmount = 200

    //Action
    try {
        await processSettleProposal(settlementJson, takerBuyerProposals, keys)
    } catch (e) {
        //noop
    }

    //Assert
    expect(chain.initiateSettlement).not.toBeCalled()
})

test('processSettleProposal throws an error when caller is not the buyer', async () => {
    //Assemble
    config.consumerId = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
    const settlementJson = '{ "requestId" : "abc1234", "secret" : "SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH"}'
    const buyerSecret = 'SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH'
    const juryPublic = 'GDIAIGUHDGMTDLKC6KFU2DIR7JVNYI4WFQ5TWTVKEHZ4G3T47HEFNUME'
    const sellerPublic = 'GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV'
    const challengeStake = 100
    const offerAmount = 200

    //Action
    try {
        await processSettleProposal(settlementJson, takerBuyerProposals, keys)
    } catch (e) {
        //Assert
        expect(e.message).toMatch('only party buying with lumens can initiate settlement')
    }
})

test('processSettleProposal calls initiateSettlement on chain when proposal is resolved', async () => {
    //Assemble
    config.consumerId = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
    const settlementJson = '{ "requestId" : "abc1234", "secret" : "SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH"}'
    const buyerSecret = 'SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH'
    const juryPublic = 'GDIAIGUHDGMTDLKC6KFU2DIR7JVNYI4WFQ5TWTVKEHZ4G3T47HEFNUME'
    const sellerPublic = 'GBRI4IPIXK63UJ2CLRWNPNCGDE43CAPIZ5B3VMWG3M4DQIWZPRQAGAHV'
    const challengeStake = 100
    const offerAmount = 200

    //Action
    await processSettleProposal(settlementJson, proposals, keys)

    //Assert
    expect(chain.initiateSettlement).toBeCalled()
    expect(chain.initiateSettlement.mock.calls[0][0]).toEqual(buyerSecret)
    expect(chain.initiateSettlement.mock.calls[0][1]).toEqual(sellerPublic)
    expect(chain.initiateSettlement.mock.calls[0][2]).toEqual(juryPublic)
    expect(chain.initiateSettlement.mock.calls[0][3]).toEqual(challengeStake)
    expect(chain.initiateSettlement.mock.calls[0][4]).toEqual(offerAmount)
})

test('processSettleProposal doest not call initiateSettlement when proposal is missing', async () => {
    //Assemble
    config.consumerId = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
    const settlementJson = '{ "requestId" : "abc1234", "secret" : "SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH"}'

    //Action
    try {
        await processSettleProposal(settlementJson, new Map(), keys)
    } catch (e) {
        //noop
    }

    //Assert
    expect(chain.initiateSettlement).not.toBeCalled()
})

test('processSettleProposal does not call initiateSettlement when proposal is not resolved', async () => {
    //Assemble
    config.consumerId = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
    const settlementJson = '{ "requestId" : "abc1234", "secret" : "SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH"}'
    const unresolvedProposals = new Map(JSON.parse(proposalsJson))
    unresolvedProposals.get('abc1234').resolution = undefined

    //Action
    try {
        await processSettleProposal(settlementJson, unresolvedProposals, keys)
    } catch (e) {
        //noop
    }

    //Assert
    expect(chain.initiateSettlement).not.toBeCalled()
})

test('processSettleProposal doest not call initiateSettlement when proposal is resolved without a taker', async () => {
    //Assemble
    config.consumerId = 'GAMCL7NNPCQQRUPZTFCSYGU36E7HVS53IWWHFPHMHD26HXIJEKKMM7Y3'
    const settlementJson = '{ "requestId" : "abc1234", "secret" : "SAQEACFGGCOY46GR5ZNVNGX53COWMEOTXEFZSM5RNBIJ4LPKHIFIDWUH"}'
    const unresolvedProposals = new Map(JSON.parse(proposalsJson))
    unresolvedProposals.get('abc1234').resolution.takerId = ''

    //Action
    try {
        await processSettleProposal(settlementJson, unresolvedProposals, keys)
    } catch (e) {
        //noop
    }

    //Assert
    expect(chain.initiateSettlement).not.toBeCalled()
})

test('processValidateAgreement does', async () => {
    //Assemble
    const param = '{"requestId": "abc1234", "agreementIndex": 0}'
    let mockAgreement = {}
    let mockAdjudication = { agreement: mockAgreement }
    let mockAdjudications = new Map()
    mockAdjudications.set('abc1234', [mockAdjudication])

    //Action
    await processValidateAgreement(param, mockAdjudications)

    //Assert
    expect(agreement.validateAgreement).toBeCalled()
    expect(agreement.validateAgreement.mock.calls[0][0]).toEqual(mockAgreement)
})

test('processValidateAGreement handles bad agreement index', async () => {
    //Assemble
    const param = '{"requestId": "abc1234", "agreementIndex": 1}'
    let mockAgreement = {}
    let mockAdjudication = { agreement: mockAgreement }
    let mockAdjudications = new Map()
    mockAdjudications.set('abc1234', [mockAdjudication])

    //Action
    try {
        await processValidateAgreement(param, mockAdjudications)
    } catch (e) {
   //Assert
        expect(e.message).toMatch('No agreement associated with that index')
    }
})

test('processValidateAGreement handles bad proposal ids', async () => {
    //Assemble
    const param = '{"requestId": "def1234", "agreementIndex": 0}'
    let mockAgreement = {}
    let mockAdjudication = { agreement: mockAgreement }
    let mockAdjudications = new Map()
    mockAdjudications.set('abc1234', [mockAdjudication])

    //Action
    try {
        await processValidateAgreement(param, mockAdjudications)
    } catch (e) {
   //Assert
        expect(e.message).toMatch('No agreement associated with that index')
    }
})
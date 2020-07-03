/* eslint-disable header/header */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */

// Import
const { ApiPromise, WsProvider } = require('@polkadot/api');
const Keyring = require('@polkadot/keyring').default;
const stringToU8a = require('@polkadot/util/string/toU8a').default;
const fetch = require('node-fetch')
const logger = require('../clientLogging')
const hostConfiguration = require('../../config/config')
const { createKeyMulti, encodeAddress, sortAddresses } = require('@polkadot/util-crypto');

// Construct
const WsP = 'wss://kusama-rpc.polkadot.io'

const multiplier = 1000000000000 //Multiplier to equal amount to 1 KSM
const platformFees = 0.001 //Base platform fee (requires multiplier)

//Prefix used to get correct format for address
//https://github.com/paritytech/substrate/wiki/External-Address-Format-(SS58)
//https://wiki.polkadot.network/docs/en/learn-accounts#for-the-curious-how-prefixes-work
//SS58Prefix = 2  <-- Kusama
const SS58Prefix = 2; //Should be determined in config as it's network specific
const threshold = 2; // Multisig threshold

const createEscrow = async (buyerPair, sellerAddress, juryAddress) => {
    //Logic to create/calculate escrow with combination
    //Assume addresses are being sent without SS58 ecodign
    addresses = [encodeAddress(buyerPair.address, SS58Prefix), encodeAddress(sellerAddress, SS58Prefix), encodeAddress(juryAddress, SS58Prefix)]

    console.debug(addresses)
    // Address as a byte array.
    const multiAddress = createKeyMulti(addresses, threshold);

    // Convert byte array to SS58 encoding.
    const Ss58Address = encodeAddress(multiAddress, SS58Prefix);

    return Ss58Address

}
//const createEscrow = async (server, buyerPair, challengeStake, nativeAmount) => {

const configureEscrow = async (buyerPair, challengeStake, nativeAmount, escrowAddress) => {
  console.debug("simple send for simple rick")
  console.debug(challengeStake)
  console.debug(nativeAmount)
  console.debug(escrowAddress)

  const wsProvider = new WsProvider(WsP);
  const api = await ApiPromise.create({ provider: wsProvider });
  //Amount should be > than 0.01 which is minimum to consider account alive
  amount = (challengeStake + nativeAmount + platformFees) * multiplier

  const txHash = await api.tx.balances
    .transfer(escrowAddress, amount)
    .signAndSend(buyerPair);

  // Show the hash
  console.debug(`Submitted with hash ${txHash}`);
  return txHash
}

const viewEscrow = async (accountId) => {
    //return escrow info
}

const initiateSettlement = async (secret, sellerAddress, juryAddress, challengeStake, nativeAmount, proposal) => {
    const keyring = new Keyring(); //default curve ed25519

    const buyerPair = keyring.addFromUri(secret); // Secret should be seed or mnemonic

    const escrowAddress = await createEscrow(buyerPair, sellerAddress, juryAddress)
    const escrowPair = { //we use this structure to match previous keypair struct return
      publicKey : function(){
        return escrowAddress
      }
    }
    await configureEscrow(buyerPair, challengeStake, nativeAmount, escrowAddress)
    return escrowPair
}

const createBuyerDisburseTransaction = async (secret, sellerKey, challengeStake, nativeAmount, escrowKey) => {
    //approveAsMulti <- not final release multiSig
    //https://polkadot.js.org/api/substrate/extrinsics.html#approveasmulti-threshold-u16-other-signatories-vec-t-accountid-maybe-timepoint-option-timepoint-t-blocknumber-call-hash-u8-32
    const wsProvider = new WsProvider(WsP);
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring(); //default curve ed25519
    const juryKey = hostConfiguration.juryKey

    console.debug(sellerKey)
    console.debug(escrowKey)
    console.debug(juryKey)

    const buyerPair = keyring.addFromUri(secret); // Secret should be seed or mnemonic
    const buyerAddress = encodeAddress(buyerPair.address, SS58Prefix)
    const sellerAddress = encodeAddress(sellerKey, SS58Prefix)
    const juryAddress = encodeAddress(juryKey, SS58Prefix)

    console.debug(buyerAddress)
    console.debug(sellerAddress)
    console.debug(juryAddress)

    const platformKey = encodeAddress(hostConfiguration.platformKey, SS58Prefix)
    const otherSignatories = [sellerAddress, juryAddress]
    const otherSignatoriesSorted = sortAddresses(otherSignatories, SS58Prefix);

    const txs = [
      api.tx.balances.transfer(sellerAddress, nativeAmount*multiplier), //paymentToSeller
      api.tx.balances.transfer(platformKey, platformFees*multiplier) //paymentToPlatform
    ];

    const transactions = api.tx.utility.batch(txs)
    //Assuming this is the first multi call thus timepoint -> null
    const tx = api.tx.multisig.approveAsMulti(threshold, otherSignatoriesSorted, null ,transactions.method.hash, 640000000);

    const promise = new Promise((resolve, reject) => {
      tx.signAndSend(buyerPair, ({ events = [], status }) => {
        console.debug(`Status: ${status.type}`)
        let index;
        let blockHash;
        if (status.isFinalized) {
          console.debug(`Hash: ${status.asFinalized}`);
          blockHash = `${status.asFinalized}`;
          events.forEach(({ state, event: { data, method, section } }) => {
            console.debug(`\t' ${state}: ${section}.${method}:: ${data}`);
            if (`${method}` === 'NewMultisig') {
              index = parseInt(state._raw, 10);
            }
            console.debug('Transaction index:', index);
          });
          resolve({ index, blockHash });
        }
      });
    });

    const { index, blockHash } = await promise;
    const signedBlock = await api.rpc.chain.getBlock(blockHash);
    const height = parseInt(signedBlock.block.header.number, 10) //Remember parseInt does not default to base 10 :P
    return {
            type: "normal",
            buyerAddress: buyerAddress,
            sellerAddress: sellerAddress,
            juryAddress: juryAddress,
            nativeAmount: nativeAmount,
            challengeStake: challengeStake,
            platformFees: platformFees,
            timepoint : {
      	      height: height,
      	      index: index
            }
    	    }
}

const submitDisburseTransaction = async (secret, tx, proposal) => {
    //https://polkadot.js.org/api/substrate/extrinsics.html#asmulti-threshold-u16-other-signatories-vec-t-accountid-maybe-timepoint-option-timepoint-t-blocknumber-call-box-t-as-trait-call
    console.debug(tx)
    const wsProvider = new WsProvider(WsP);
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring(); //default curve ed25519
    const sellerPair = keyring.addFromUri(secret); // Secret should be seed or mnemonic
    const buyerAddress = tx.buyerAddress //Already encoded
    const juryAddress = tx.juryAddress //Already encoded
    const sellerAddress = encodeAddress(sellerPair.address, SS58Prefix)

    //Sanity check
    if(sellerAddress != tx.sellerAddress){
      console.debug("something might be wrong with the address used for seller")
    }

    const timepoint = tx.timepoint
    const platformKey = encodeAddress(hostConfiguration.platformKey, SS58Prefix)
    const otherSignatories = [buyerAddress, juryAddress]
    const otherSignatoriesSorted = sortAddresses(otherSignatories, SS58Prefix);

    let txs = []
    //We need to replicate initial disburse command thus, we check tx type
    if(tx.type == "settle_buyer"){
      txs = [
        api.tx.balances.transfer(buyerAddress, tx.nativeAmount*multiplier), //reverseToBuyer
        api.tx.balances.transfer(platformKey, tx.platformFees*multiplier), //paymentToPlatform
        api.tx.balances.transfer(juryAddress, tx.challengeStake*multiplier) //paymentJury
      ];
    }
    else if (tx.type == "settle_seller"){
      txs = [
        api.tx.balances.transfer(sellerAddress, tx.nativeAmount*multiplier), //reverseToBuyer
        api.tx.balances.transfer(platformKey, tx.platformFees*multiplier), //paymentToPlatform
        api.tx.balances.transfer(juryAddress, tx.challengeStake*multiplier) //paymentJury
      ];
    }
    else {
      //normal --> challenge stake is part of release
      txs = [
        api.tx.balances.transfer(sellerAddress, (tx.nativeAmount+tx.challengeStake)*multiplier), //paymentToSeller
        api.tx.balances.transfer(platformKey, tx.platformFees*multiplier) //paymentToPlatform
      ];
    }

    const transactions = api.tx.utility.batch(txs)
    const multi_tx = api.tx.multisig.asMulti(threshold, otherSignatoriesSorted, timepoint, transactions.method.toHex(), false, 640000000);

    const promise = new Promise((resolve, reject) => {
      multi_tx.signAndSend(sellerPair, ({ events = [], status }) => {
        console.debug(`Status: ${status.type}`)
        if (status.isFinalized) {
          console.debug(`Hash: ${status.asFinalized}`);
          events.forEach(({ state, event: { data, method, section } }) => {
            console.debug(`\t' ${state}: ${section}.${method}:: ${data}`);
          });

          resolve(`${status.asFinalized}`);
        }
      });
    });
    const hash = await promise
    return hash
}

const transactionHistory = async (accountId) => {
  //fetch tx history
}

const createFavorBuyerTransaction = async (secret, escrowKey, buyerKey, challengeStake, agreement, keys) => {
//ruling in favor of buyer - pay challenge fees to jury, platform, and merge escrow to buyers account
//Assume escrow is encoded BUT buyer address is unencoded
    const nativeAmount = agreement.body.offerAmount
    const wsProvider = new WsProvider(WsP);
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring(); //default curve ed25519

    console.debug(buyerKey)
    console.debug(escrowKey)
    sellerKey = ""
    if (agreement.body.offerAsset === 'native') {
        sellerKey = agreement.next.body.takerId
    } else {
        sellerKey = agreement.body.makerId
    }

    const sellerAddress = encodeAddress(sellerKey, SS58Prefix)
    const juryPair = keyring.addFromUri(secret); // Secret should be seed or mnemonic
    const juryAddress = encodeAddress(juryPair.address, SS58Prefix)
    const buyerAddress = encodeAddress(buyerKey, SS58Prefix)

    console.debug(buyerAddress)
    console.debug(juryAddress)

    const platformKey = encodeAddress(hostConfiguration.platformKey, SS58Prefix)
    const otherSignatories = [sellerAddress, buyerAddress]
    const otherSignatoriesSorted = sortAddresses(otherSignatories, SS58Prefix);


    const txs = [
      api.tx.balances.transfer(buyerAddress, nativeAmount*multiplier), //reverseToBuyer
      api.tx.balances.transfer(platformKey, platformFees*multiplier), //paymentToPlatform
      api.tx.balances.transfer(juryAddress, challengeStake*multiplier) //paymentJury
    ];

    const transactions = api.tx.utility.batch(txs)
    //Assuming this is the first multi call thus timepoint -> null
    const tx = api.tx.multisig.approveAsMulti(threshold, otherSignatoriesSorted, null ,transactions.method.hash, 640000000);

    const promise = new Promise((resolve, reject) => {
      tx.signAndSend(juryPair, ({ events = [], status }) => {
        console.debug(`Status: ${status.type}`)
        let index;
        let hash;
        if (status.isFinalized) {
          console.debug(`Hash: ${status.asFinalized}`);
          hash = `${status.asFinalized}`;
          events.forEach(({ state, event: { data, method, section } }) => {
            console.debug(`\t' ${state}: ${section}.${method}:: ${data}`);
            if (`${method}` === 'NewMultisig') {
              index = parseInt(state._raw, 10);
            }
            console.debug('Transaction index:', index);
          });

          resolve({ index, hash });
        }
      });
    });

    const { index, hash } = await promise;
    const signedBlock = await api.rpc.chain.getBlock(hash);
    const height = parseInt(signedBlock.block.header.number, 10) //Remember parseInt does not default to base 10 :P
    return {
            type: "settle_buyer",
            buyerAddress: buyerAddress,
            sellerAddress: sellerAddress,
            juryAddress: juryAddress,
            challengeStake: challengeStake,
            nativeAmount: nativeAmount,
            platformFees: platformFees,
            timepoint : {
      	      height: height,
      	      index: index
            }
    	    }
}

const createFavorSellerTransaction = async (secret, escrowKey, buyerKey, sellerKey, challengeStake, nativeAmount) => {
//ruling in favor of seller - pay challenge fees to jury, offerAmount to seller, and merge escrow to buyers account
    const wsProvider = new WsProvider(WsP);
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring(); //default curve ed25519

    console.debug(buyerKey)
    console.debug(escrowKey)
    console.debug(sellerKey)


    const juryPair = keyring.addFromUri(secret); // Secret should be seed or mnemonic
    const juryAddress = encodeAddress(juryPair.address, SS58Prefix)
    const buyerAddress = encodeAddress(buyerKey, SS58Prefix)
    const sellerAddress = encodeAddress(sellerKey, SS58Prefix)

    console.debug(buyerAddress)
    console.debug(sellerAddress)
    console.debug(juryAddress)

    const platformKey = encodeAddress(hostConfiguration.platformKey, SS58Prefix)
    const otherSignatories = [sellerAddress, buyerAddress]
    const otherSignatoriesSorted = sortAddresses(otherSignatories, SS58Prefix);


    const txs = [
      api.tx.balances.transfer(sellerAddress, nativeAmount*multiplier), //reverseToBuyer
      api.tx.balances.transfer(platformKey, platformFees*multiplier), //paymentToPlatform
      api.tx.balances.transfer(juryAddress, challengeStake*multiplier) //paymentJury
    ];

    const transactions = api.tx.utility.batch(txs)
    //Assuming this is the first multi call thus timepoint -> null
    const tx = api.tx.multisig.approveAsMulti(threshold, otherSignatoriesSorted, null ,transactions.method.hash, 640000000);

    const promise = new Promise((resolve, reject) => {
      tx.signAndSend(juryPair, ({ events = [], status }) => {
        console.debug(`Status: ${status.type}`)
        let index;
        let hash;
        if (status.isFinalized) {
          console.debug(`Hash: ${status.asFinalized}`);
          hash = `${status.asFinalized}`;
          events.forEach(({ state, event: { data, method, section } }) => {
            console.debug(`\t' ${state}: ${section}.${method}:: ${data}`);
            if (`${method}` === 'NewMultisig') {
              index = parseInt(state._raw, 10);
            }
            console.debug('Transaction index:', index);
          });

          resolve({ index, hash });
        }
      });
    });

    const { index, hash } = await promise;
    const signedBlock = await api.rpc.chain.getBlock(hash);
    const height = parseInt(signedBlock.block.header.number, 10) //Remember parseInt does not default to base 10 :P
    return {
            type: "settle_seller",
            buyerAddress: buyerAddress,
            sellerAddress: sellerAddress,
            juryAddress: juryAddress,
            challengeStake: challengeStake,
            nativeAmount: nativeAmount,
            platformFees: platformFees,
            timepoint : {
      	      height: height,
      	      index: index
            }
    	    }
}

const viewTransactionOperations = async (transactions) => {
    return transactions
}


module.exports = { initiateSettlement, transactionHistory, viewEscrow, createBuyerDisburseTransaction, submitDisburseTransaction, createFavorBuyerTransaction, createFavorSellerTransaction, viewTransactionOperations }

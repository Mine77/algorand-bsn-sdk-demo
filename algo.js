// import dependencies
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// import algosdk
const algosdk = require("algosdk");

// API server address and API token
const algodServer =
  process.env.NETWORK == "Mainnet"
    ? process.env.ALGOD_SERVER_MAINNET
    : process.env.NETWORK == "Testnet"
    ? process.env.ALGOD_SERVER_TESTNET
    : undefined;
const port = "";
const token = {
  "X-API-Key":   process.env.NETWORK == "Mainnet"
  ? process.env.API_TOKEN_MAINNET
  : process.env.NETWORK == "Testnet"
  ? process.env.API_TOKEN_TESTNET
  : undefined
};

// instantiate the algorand client
const algodClient = new algosdk.Algodv2(token, algodServer, port);

// Utility function to wait for tx confirmation
function waitForConfirmation(algodClient, txId) {
  var p = new Promise(function (resolve, reject) {
    console.log("Waiting transaction: " + txId + " to be confirmed...");
    var counter = 1000;
    let interval = setInterval(() => {
      if (--counter === 0) reject("Confirmation Timeout");
      algodClient
        .pendingTransactionInformation(txId)
        .do()
        .then((pendingInfo) => {
          if (pendingInfo != undefined) {
            let confirmedRound = pendingInfo["confirmed-round"];
            if (confirmedRound !== null && confirmedRound > 0) {
              clearInterval(interval);
              const explorerLink = process.env.NETWORK == "Mainnet"
              ? "https://algoexplorer.io/tx/" + txId
              : process.env.NETWORK == "Testnet"
              ? "https://testnet.algoexplorer.io/tx/" + txId
              : undefined;
              resolve("Transaction confirmed: " + explorerLink);
            }
          }
        })
        .catch(reject);
    }, 2000);
  });
  return p;
}

// Function for sending payment transaction
function sendPaymentTransaction(account, to, amount) {
  var p = new Promise(function (resolve) {
    // use closeRemainderTo paramerter when you want to close an account
    let closeRemainderTo = undefined;
    // use note parameter when you want to attach a string to the transaction
    let note = undefined;
    algodClient
      .getTransactionParams()
      .do()
      .then((params) => {
        let txn = algosdk.makePaymentTxnWithSuggestedParams(
          account.addr,
          to,
          amount,
          closeRemainderTo,
          note,
          params
        );
        // sign the transaction
        var signedTxn = algosdk.signTransaction(txn, account.sk);
        algodClient
          .sendRawTransaction(signedTxn.blob)
          .do()
          .then((tx) => {
            waitForConfirmation(algodClient, tx.txId)
              .then(resolve)
              .catch(console.log);
          })
          .catch(console.log);
      })
      .catch(console.log);
  });
  return p;
}

// Function for sending an asset creation transaction
function createAsset(
  account,
  assetName,
  unitName,
  decimals,
  totalIssuance,
  assetUrl,
  assetMetadataHash,
  manager,
  reserve,
  freeze,
  clawback,
  defaultFrozen
) {
  var p = new Promise(function (resolve, reject) {
    // get chain parameters for sending transactions
    algodClient
      .getTransactionParams()
      .do()
      .then((params) => {
        // use note parameter when you want to attach a string to the transaction
        let note = undefined;
        let assetMetadataHash = undefined;
        // construct the asset creation transaction
        let txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
          account.addr,
          note,
          totalIssuance,
          decimals,
          defaultFrozen,
          manager,
          reserve,
          freeze,
          clawback,
          unitName,
          assetName,
          assetUrl,
          assetMetadataHash,
          params
        );
        var signedTxn = algosdk.signTransaction(txn, account.sk);
        algodClient
          .sendRawTransaction(signedTxn.blob)
          .do()
          .then((tx) => {
            waitForConfirmation(algodClient, tx.txId)
              .then((msg) => {
                console.log(msg);
                algodClient
                  .pendingTransactionInformation(tx.txId)
                  .do()
                  .then((ptx) => {
                    // get the asset ID
                    let assetId = ptx["asset-index"];
                    resolve(assetId);
                  })
                  .catch(reject);
              })
              .catch(console.log);
          })
          .catch(console.log);
      })
      .catch(reject);
  });
  return p;
}

// Function for sending asset transaction
function sendAssetTransaction(account, to, amount, assetId) {
  var p = new Promise(function (resolve) {
    // use closeRemainderTo paramerter when you want to close an account
    let closeRemainderTo = undefined;
    // use note parameter when you want to attach a string to the transaction
    let note = undefined;
    // use revocationTarget when you want to clawback assets
    let revocationTarget = undefined;
    algodClient
      .getTransactionParams()
      .do()
      .then((params) => {
        let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
          account.addr,
          to,
          closeRemainderTo,
          revocationTarget,
          amount,
          note,
          assetId,
          params
        );
        // sign the transaction
        var signedTxn = algosdk.signTransaction(txn, account.sk);
        algodClient
          .sendRawTransaction(signedTxn.blob)
          .do()
          .then((tx) => {
            waitForConfirmation(algodClient, tx.txId)
              .then(resolve)
              .catch(console.log);
          })
          .catch(console.log);
      })
      .catch(console.log);
  });
  return p;
}

function compileContract(contractDir) {
  var p = new Promise(function (resolve) {
    // read the contract file
    const filePath = path.join(__dirname, contractDir);
    const data = fs.readFileSync(filePath);

    // Compile teal contract
    algodClient.compile(data).do().then(resolve).catch(console.log);
  });
  return p;
}

function sendSwapTransaction(buyerAccount, contractAddr, lsig) {
  var p = new Promise(function (resolve) {
    const assetId = 15977673;
    const closeRemainderTo = undefined;
    const note = undefined;
    const revocationTarget = undefined;
    const aliceAddress =
      "2YI264DKCDYQX5XMVFAQYXBV3PRJATRBNUN2UKPYJGK6KWNRF6XYUVPHQA";
    algodClient
      .getTransactionParams()
      .do()
      .then((params) => {
        // make the algo payment tx from contract to buyer
        let algoPaymentTx = algosdk.makePaymentTxnWithSuggestedParams(
          contractAddr,
          buyerAccount.addr,
          10,
          closeRemainderTo,
          note,
          params
        );
        // make the asset transfer tx from buyer to Alice
        let assetTransferTx = algosdk.makeAssetTransferTxnWithSuggestedParams(
          buyerAccount.addr,
          aliceAddress,
          closeRemainderTo,
          revocationTarget,
          10,
          note,
          assetId,
          params
        );
        // put 2 tx into an array
        const txns = [algoPaymentTx, assetTransferTx];
        // assign the group tx ID
        const txGroup = algosdk.assignGroupID(txns);
        // sign the first tx with the contract logic sig
        const signedAlgoPaymentTx = algosdk.signLogicSigTransactionObject(
          txGroup[0],
          lsig
        );
        // sign the second tx with the buyer's private key
        const signedAssetTransferTx = txGroup[1].signTxn(buyerAccount.sk);
        // assemble transactions
        let signedTxs = [];
        signedTxs.push(signedAlgoPaymentTx.blob);
        signedTxs.push(signedAssetTransferTx);
        algodClient
          .sendRawTransaction(signedTxs)
          .do()
          .then((tx) => {
            waitForConfirmation(algodClient, tx.txId)
              .then(resolve)
              .catch(console.log);
          })
          .catch(console.log);
      })
      .catch(console.log);
  });
  return p;
}

module.exports = {
  sendPaymentTransaction,
  createAsset,
  sendAssetTransaction,
  compileContract,
  sendSwapTransaction,
};

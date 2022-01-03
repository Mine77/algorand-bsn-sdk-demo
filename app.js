const algo = require("./algo");
const algosdk = require("algosdk");
require("dotenv").config();

// create account instance
const aliceAccount = algosdk.mnemonicToSecretKey(process.env.ALICE_MNEMONIC);
const bobAccount = algosdk.mnemonicToSecretKey(process.env.BOB_MNEMONIC);

// Create an account using sdk
let myAccount = algosdk.generateAccount();
console.log("Created Account:");
console.log(myAccount);
console.log(myAccount + "\n");

// convert private key to mnemonice
let myMnemonic = algosdk.secretKeyToMnemonic(myAccount.sk);
console.log("Account Mnemonic:\n" + myMnemonic + "\n");

// convert it back
myAccount = algosdk.mnemonicToSecretKey(myMnemonic);
console.log("Account:");
console.log(myAccount);
console.log(myAccount + "\n");

// send a payment transaction
algo
  .sendPaymentTransaction(aliceAccount, bobAccount.addr, 10)
  .then(console.log)
  .catch(console.log);

// parameters for creating ASA
let account = aliceAccount;
let assetName = "Alice Token";
let unitName = "HT";
let decimals = 2;
let totalIssuance = 100000;
let assetUrl = "https://algorand.foundation/";
let assetMetadataHash = undefined;
let manager = aliceAccount.addr;
let reserve = aliceAccount.addr;
let freeze = aliceAccount.addr;
let clawback = aliceAccount.addr;
let defaultFrozen = false;
let amount = 10;

// sending transaction for creating assets
algo
  .createAsset(
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
  )
  .then((assetId) => {
    // sending transaction for opt-in the asset
    algo
      .sendAssetTransaction(bobAccount, bobAccount.addr, 0, assetId)
      .then((msg) => {
        console.log(msg);
        // sending transaction for transferring assets
        algo
          .sendAssetTransaction(aliceAccount, bobAccount.addr, amount, assetId)
          .then(console.log)
          .catch(console.log);
      })
      .catch(console.log);
  })
  .catch(console.log);

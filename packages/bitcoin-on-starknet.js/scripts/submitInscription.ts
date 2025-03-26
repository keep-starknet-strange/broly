import {
  BitcoinProvider,
  BitcoinProxiedRpcProvider,
  UtuProvider,
  serializedHash,
} from "../src";
import { Account, CallData, RpcProvider, byteArray } from "starknet";
import { byteArrayFromHexString, formatFelt, toLittleEndianHex } from "../src/UtuProvider";
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Initialize providers
  // Bitcoin RPC provider Quicknode
  const bitcoinProvider: BitcoinProvider = new BitcoinProxiedRpcProvider(
    "https://" + process.env.BITCOIN_RPC_USER + ".btc.quiknode.pro/" + process.env.BITCOIN_RPC_PASS
  );
  const utuProvider = new UtuProvider(bitcoinProvider);

  // Configure Starknet provider for Sepolia testnet
  const starknetProvider = new RpcProvider({
    nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_7",
  });

  // Initialize Starknet account using environment variables
  // Requires STARKNET_ADDRESS and STARKNET_PRIVATE_KEY to be set
  const account = new Account(
    starknetProvider,
    process.env.STARKNET_ADDRESS as string,
    process.env.STARKNET_PRIVATE_KEY as string
  );

  try {
    // Fetch Bitcoin inscription submission calldata

    // `tx_hash`
    const txId = process.argv[2];
    console.log("tx_hash:", txId);
    const inscriptionId = process.argv[3];
    
    // Get raw transaction
    const rawTransaction = await bitcoinProvider.getRawTransaction(txId, true);
    
    // `prev_tx_hash`
    const prevTxId = rawTransaction.vin[0].txid;
    console.log("prev_tx_hash: ", prevTxId);

    const prevRawTransaction = await bitcoinProvider.getRawTransaction(prevTxId, true);
    const linkedOutputs = await bitcoinProvider.getRawTransaction(prevRawTransaction.vin[0].txid);
    const linkedOutput = linkedOutputs.vout[prevRawTransaction.vin[0].vout];
    const linkedScriptPubKey = prevRawTransaction.vout[0].scriptPubKey.hex;

    const header = await bitcoinProvider.getBlockHeader(rawTransaction.blockhash);
    
    // `block_height`
    const blockHeight = header.height;
    const pastHeader = await bitcoinProvider.getBlockHeader(prevRawTransaction.blockhash);
    // `prev_block_height`
    const prevHeight = pastHeader.height;

    // `height_proof`
    const blockHeightProof = await utuProvider.getBlockHeightProof(header.height);

    // `prev_height_proof`
    const prevBlockHeightProof = await utuProvider.getBlockHeightProof(pastHeader.height);

    // `inclusion_proof`
    // Generate Merkle proof for transfer verification
    const txInclusionProof = await utuProvider.getTxInclusionProof(txId); // siblings
    console.log("inclusion_proof: ", txInclusionProof);
    // `prev_inclusion_proof`
    const prevTxInclusionProof = await utuProvider.getTxInclusionProof(prevTxId);
    console.log("prev_inclusion_proof: ", prevTxInclusionProof)

    // Prepare calldata for `submit_transaction` function

    var calldata: String[] = [];
    calldata.push(inscriptionId); // inscription id
    calldata.push("0x5354524b"); // currency fee
    const compiledTxIdArray = CallData.compile(
      byteArray.byteArrayFromString(txId.toString())
    );
    compiledTxIdArray.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue);
    });

    const compiledPrevTxIdArray = CallData.compile(
      byteArray.byteArrayFromString(prevTxId.toString())
    );
    compiledPrevTxIdArray.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue);
    });

    // Transactions
    const txVersion = rawTransaction.version;
    calldata.push("0x" + txVersion.toString(16));

    const isSegwit = rawTransaction.hex.substring(8, 12) === "0001";
    const segwitHex = isSegwit ? "0x1" : "0x0"; 
    calldata.push(segwitHex);

    // inputs 
    calldata.push("0x" + rawTransaction.vin.length.toString(16));

    // `TxIn` first input
    const hex1 = rawTransaction.vin[0].scriptSig.hex;
    const compiledHex1 = CallData.compile(byteArrayFromHexString(hex1));
    compiledHex1.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue);
    }); // script
    calldata.push("0x" + rawTransaction.vin[0].sequence.toString(16)); // sequence

    // `OutPoint`
    calldata.push(...serializedHash(rawTransaction.vin[0].txid)); // txid
    // calldata.push("0x" + rawTransaction.vin[0].vout.toString(16)); // vout
    calldata.push("0x0"); // TODO

    // data: `TxOut`
    const prevSatoshiValue = BigInt(Math.round(100000000 * Number(prevRawTransaction.vout[0].value)));
    calldata.push("0x" + BigInt(prevSatoshiValue).toString(16));

    // pk_script
    const scriptPubKeyHex = prevRawTransaction.vout[0].scriptPubKey.hex;
    const compiledPkScript = CallData.compile(byteArrayFromHexString(scriptPubKeyHex));
    compiledPkScript.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue);
    });
    calldata.push("0x0"); // cached: false

    calldata.push("0x0"); // block_height
    calldata.push("0x0"); // median_time_past
    calldata.push("0x0"); // is_coinbase
    
    // witness
    const witnessLen = rawTransaction.vin[0].txinwitness.length;
    calldata.push("0x" + BigInt(witnessLen).toString(16));

    for (let i=0; i < witnessLen; i++) {
      const compiledWitness = CallData.compile(byteArrayFromHexString(rawTransaction.vin[0].txinwitness[i]));
      compiledWitness.forEach((num) => {
        const hexValue = "0x" + BigInt(num).toString(16);
        calldata.push(hexValue);
      });
    }

    // `TxIn` second input
    const hex2 = rawTransaction.vin[1].scriptSig.hex;
    
    const compiledHex2 = CallData.compile(byteArrayFromHexString(hex2));
    compiledHex2.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue);
    }); // script
    calldata.push("0x" + rawTransaction.vin[1].sequence.toString(16)); // sequence

    // `OutPoint`
    calldata.push(...serializedHash(rawTransaction.vin[1].txid)); // txid
    calldata.push("0x" + rawTransaction.vin[1].vout.toString(16)); // vout

    // data: `TxOut`
    const changeTxId = rawTransaction.vin[1].txid;
    const prevChangeTransaction = await bitcoinProvider.getRawTransaction(changeTxId, true);
    const prevChangeVout = rawTransaction.vin[1].vout;
    const prevChangeOutput = prevChangeTransaction.vout[prevChangeVout];
    const prevChangeSatoshiValue = BigInt(Math.round(100000000 * Number(prevChangeOutput.value)));
    calldata.push("0x" + prevChangeSatoshiValue.toString(16));
    const changeScriptPubKey = prevChangeOutput.scriptPubKey.hex;
    const compiledChangePkScript = CallData.compile(byteArrayFromHexString(changeScriptPubKey));
    compiledChangePkScript.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue);
    }); // pk_script
    calldata.push("0x0"); // cached: false
    
    calldata.push("0x0"); // block_height
    calldata.push("0x0"); // median_time_past
    calldata.push("0x0"); // is_coinbase
    
    // witness
    const changeWitnessLen = rawTransaction.vin[1].txinwitness.length;
    calldata.push("0x" + BigInt(changeWitnessLen).toString(16));

    for (let i=0; i < changeWitnessLen; i++) {
      const compiledWitness = CallData.compile(byteArrayFromHexString(rawTransaction.vin[1].txinwitness[i]));
      compiledWitness.forEach((num) => {
        const hexValue = "0x" + BigInt(num).toString(16);
        calldata.push(hexValue);
      });
    }

    // outputs
    calldata.push("0x" + rawTransaction.vout.length.toString(16));

    // `TxOut` first output
    const satoshiValue1 = BigInt(Math.round(100000000 * Number(rawTransaction.vout[0].value)));
    calldata.push("0x" + satoshiValue1.toString(16));
    const inscriptionScriptPubKey = rawTransaction.vout[0].scriptPubKey.hex;
    const compiledScriptPubKey = CallData.compile(byteArrayFromHexString(inscriptionScriptPubKey));
    compiledScriptPubKey.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue); 
    }); // pk_script
    calldata.push("0x0"); // cached: false

    // `TxOut` second output
    const satoshiValue2 = BigInt(Math.round(100000000 * Number(rawTransaction.vout[1].value)));
    calldata.push("0x" + satoshiValue2.toString(16));

    const changePubKeyHex = rawTransaction.vout[1].scriptPubKey.hex;
    const compiledChangePubKey = CallData.compile(byteArrayFromHexString(changePubKeyHex));
    compiledChangePubKey.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue);
    }); // pk_script change
    calldata.push("0x0"); // cached: false

    // lock_time
    calldata.push("0x" + BigInt(rawTransaction.locktime).toString(16));

    // end of tx
    
    // prev tx
    const prevTxVersion = prevRawTransaction.version;
    calldata.push("0x" + prevTxVersion.toString(16));

    const prevTxIsSegwit = prevRawTransaction.hex.substring(8, 12) === "0001";
    const prevSegwitHex = prevTxIsSegwit ? "0x1" : "0x0"; 
    calldata.push(prevSegwitHex);
      
    // inputs
    calldata.push("0x" + prevRawTransaction.vin.length.toString(16));
    const prevHex1 = prevRawTransaction.vin[0].scriptSig.hex;
    const compiledPrevHex1 = CallData.compile(byteArrayFromHexString(prevHex1));
    compiledPrevHex1.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue); 
    });
    calldata.push("0x" + prevRawTransaction.vin[0].sequence.toString(16));
      
    // `OutPoint`
    calldata.push(...serializedHash(prevRawTransaction.vin[0].txid)); // txid
    calldata.push("0x" + prevRawTransaction.vin[0].vout.toString(16)); // vout

    // data: `TxOut`
    const linkedSatoshiValue = BigInt(Math.round(100000000 * Number(linkedOutput.value)));
    calldata.push("0x" + linkedSatoshiValue.toString(16));
    const compiledLinkedScriptPubKey = CallData.compile(byteArrayFromHexString(linkedScriptPubKey));
    compiledLinkedScriptPubKey.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue);
    }); // pk_script    
    calldata.push("0x0"); // cached: false

    calldata.push("0x0"); // block_height
    calldata.push("0x0"); // median_time_past
    calldata.push("0x0"); // is_coinbase

    // witness
    const prevWitnessLen = prevRawTransaction.vin[0].txinwitness.length;
    calldata.push("0x" + BigInt(prevWitnessLen).toString(16));

    for (let i=0; i < prevWitnessLen; i++) {
      const compiledWitness = CallData.compile(byteArrayFromHexString(prevRawTransaction.vin[0].txinwitness[i]));
      compiledWitness.forEach((num) => {
        const hexValue = "0x" + BigInt(num).toString(16);
        calldata.push(hexValue);
      });
    }
    
    // output (only one output for the inscription creation transaction)
    calldata.push("0x" + prevRawTransaction.vout.length.toString(16));

    // TxOut
    const prevOutSatoshiValue = BigInt(Math.round(100000000 * Number(prevRawTransaction.vout[0].value)));
    calldata.push("0x" + prevOutSatoshiValue.toString(16));

    const prevTxOutputPkScript = prevRawTransaction.vout[0].scriptPubKey.hex;
    const compiledPrevTxScriptPubKey = CallData.compile(byteArrayFromHexString(prevTxOutputPkScript));
    compiledPrevTxScriptPubKey.forEach((num) => {
      const hexValue = "0x" + BigInt(num).toString(16);
      calldata.push(hexValue);
    }); // pk_script
    calldata.push("0x0"); // cached: false

    // lock_time
    calldata.push("0x" + BigInt(prevRawTransaction.locktime).toString(16));

    // end of prev tx

    // pk_script
    const pkScriptHex = rawTransaction.vout[0].scriptPubKey.hex; // e.g. "a914543c330b5c8fa2e4843f0f52ac4a8a3882bbc9bb87"

    const hexBytes = pkScriptHex.match(/.{2}/g);
    const pkScriptBytes = hexBytes.map(byte => "0x" + byte);

    calldata.push("0x" + pkScriptBytes.length.toString(16));
    pkScriptBytes.forEach(byte => calldata.push(byte));


    // block heights
    calldata.push("0x" + blockHeight.toString(16));
    calldata.push("0x" + prevHeight.toString(16));

    // TODO: use serializeBlockHeader function from UtuProvider
    // headers
    calldata.push(formatFelt(toLittleEndianHex(header.version)));
    calldata.push(...serializedHash(header.previousblockhash));
    calldata.push(...serializedHash(header.merkleroot));
    calldata.push(formatFelt(toLittleEndianHex(header.time)));
    calldata.push(formatFelt(header.bits));
    calldata.push(formatFelt(toLittleEndianHex(header.nonce)));

    calldata.push(formatFelt(toLittleEndianHex(pastHeader.version)));
    calldata.push(...serializedHash(pastHeader.previousblockhash));
    calldata.push(...serializedHash(pastHeader.merkleroot));
    calldata.push(formatFelt(toLittleEndianHex(pastHeader.time)));
    calldata.push(formatFelt(pastHeader.bits));
    calldata.push(formatFelt(toLittleEndianHex(pastHeader.nonce)));

    // height proofs
    if (blockHeightProof) {
      // Option::Some
      calldata.push("0x0");

      // block header
      calldata.push(formatFelt(toLittleEndianHex(header.version)));
      calldata.push(...serializedHash(header.previousblockhash));
      calldata.push(...serializedHash(header.merkleroot));
      calldata.push(formatFelt(toLittleEndianHex(header.time)));
      calldata.push(formatFelt(header.bits));
      calldata.push(formatFelt(toLittleEndianHex(header.nonce)));
  

      const byteArrayCoinbaseTx = CallData.compile(byteArray.byteArrayFromString(blockHeightProof.rawCoinbaseTx));
      byteArrayCoinbaseTx.forEach((num) => {
        const hexValue = "0x" + BigInt(num).toString(16);
        calldata.push(hexValue);
      });

      calldata.push(
        "0x" + blockHeightProof.merkleProof.length.toString(16)
      );

      for (let i=0; i < blockHeightProof.merkleProof.length; i++) {
        calldata.push(...serializedHash(blockHeightProof.merkleProof[i]));
      };
    } else {
      // Option::None
      calldata.push("0x1");
    }

    if (prevBlockHeightProof) {
      // Option::Some
      calldata.push("0x0");

      // block header
      calldata.push(formatFelt(toLittleEndianHex(pastHeader.version)));
      calldata.push(...serializedHash(pastHeader.previousblockhash));
      calldata.push(...serializedHash(pastHeader.merkleroot));
      calldata.push(formatFelt(toLittleEndianHex(pastHeader.time)));
      calldata.push(formatFelt(pastHeader.bits));
      calldata.push(formatFelt(toLittleEndianHex(pastHeader.nonce)));  

      // const prevByteArrayCoinbaseTx = byteArrayFromHexString(prevBlockHeightProof.rawCoinbaseTx);

      const prevByteArrayCoinbaseTx = CallData.compile(byteArray.byteArrayFromString(prevBlockHeightProof.rawCoinbaseTx));
      prevByteArrayCoinbaseTx.forEach((num) => {
        const hexValue = "0x" + BigInt(num).toString(16);
        calldata.push(hexValue);
      });

      calldata.push(
        "0x" + prevBlockHeightProof.merkleProof.length.toString(16)
      );

      for (let i=0; i < prevBlockHeightProof.merkleProof.length; i++) {
        calldata.push(...serializedHash(prevBlockHeightProof.merkleProof[i]));
      };
    } else {
      // Option::None
      calldata.push("0x1");
    }

    // inclusion proofs
    calldata.push("0x" + BigInt(txInclusionProof.length).toString(16));
    txInclusionProof.forEach(([hash, direction]: [string, boolean]) => {
      calldata.push(...serializedHash(hash)); // Merkle proof hash
      calldata.push(direction ? "0x1" : "0x0"); // Direction (bool)
    });

    calldata.push("0x" + BigInt(prevTxInclusionProof.length).toString(16));
    prevTxInclusionProof.forEach(([hash, direction]: [string, boolean]) => {
      calldata.push(...serializedHash(hash)); // Merkle proof hash
      calldata.push(direction ? "0x1" : "0x0"); // Direction (bool)
    });
    
    const brolyAddress = "0x00eb978fc1f6be290dbe2020db8e8b748d26925801ed79e904e12bfc5ce3582e";

    const submitCall = {
      contractAddress: brolyAddress, // Broly contract
      entrypoint:
        "submit_inscription",
      calldata: calldata,
    };
    
    await account.execute(submitCall, { maxFee: "0x1100000000000" });

  } catch (error) {
    console.error("Error:", error);
  }
}

main();

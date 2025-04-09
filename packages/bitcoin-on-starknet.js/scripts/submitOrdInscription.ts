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
  
      const header = await bitcoinProvider.getBlockHeader(rawTransaction.blockhash);
      
      // `block_height`
      const blockHeight = header.height;
  
      // `height_proof`
      const blockHeightProof = await utuProvider.getBlockHeightProof(header.height);
  
      // `inclusion_proof`
      // Generate Merkle proof for transfer verification
      const txInclusionProof = await utuProvider.getTxInclusionProof(txId); // siblings
      console.log("inclusion_proof: ", txInclusionProof);
  
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
  
      // Transaction
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
      calldata.push("0x" + rawTransaction.vin[0].vout.toString(16)); // vout
      console.log('vout: ', rawTransaction.vin[0].vout);
      // calldata.push("0x0"); // TODO
  
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
  
      // lock_time
      calldata.push("0x" + BigInt(rawTransaction.locktime).toString(16));
  
      // end of tx
  
      // pk_script
      const pkScriptHex = rawTransaction.vout[0].scriptPubKey.hex; // e.g. "a914543c330b5c8fa2e4843f0f52ac4a8a3882bbc9bb87"
  
      const hexBytes = pkScriptHex.match(/.{2}/g);
      const pkScriptBytes = hexBytes.map(byte => "0x" + byte);
  
      calldata.push("0x" + pkScriptBytes.length.toString(16));
      pkScriptBytes.forEach(byte => calldata.push(byte));
  
  
      // block height
      calldata.push("0x" + blockHeight.toString(16));
  
      // TODO: use serializeBlockHeader function from UtuProvider
      // headers
      calldata.push(formatFelt(toLittleEndianHex(header.version)));
      calldata.push(...serializedHash(header.previousblockhash));
      calldata.push(...serializedHash(header.merkleroot));
      calldata.push(formatFelt(toLittleEndianHex(header.time)));
      calldata.push(formatFelt(header.bits));
      calldata.push(formatFelt(toLittleEndianHex(header.nonce)));
  
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
  
      // inclusion proofs
      calldata.push("0x" + BigInt(txInclusionProof.length).toString(16));
      txInclusionProof.forEach(([hash, direction]: [string, boolean]) => {
        calldata.push(...serializedHash(hash)); // Merkle proof hash
        calldata.push(direction ? "0x1" : "0x0"); // Direction (bool)
      });
      
      const brolyAddress = "0x01888434b64e6b81488bc7b3a7148aa5fccc695591225351227a4314da6a64d5";
  
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
  
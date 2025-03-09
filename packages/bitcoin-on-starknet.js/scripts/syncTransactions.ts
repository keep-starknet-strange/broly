import {
    BitcoinProvider,
    BitcoinProxiedRpcProvider,
    UtuProvider,
  } from "../src";
import { Account, RpcProvider } from "starknet";
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
        const txId = "ccfe4da8d312b18753bbf693e3014cfcfa857cf73f8f822f81a301f4f4f408d5";
        const rawTransaction = await bitcoinProvider.getRawTransaction(txId, true);
        const prevTxId = rawTransaction.vin[0].txid;    
        const prevRawTransaction = await bitcoinProvider.getRawTransaction(prevTxId, true);

        const header = await bitcoinProvider.getBlockHeader(rawTransaction.blockhash);
        const pastHeader = await bitcoinProvider.getBlockHeader(prevRawTransaction.blockhash);

        // Generate synchronization transactions for Starknet
        // These ensure the Bitcoin state is properly reflected on Starknet
        interface SyncTransaction {
            contractAddress: string;
            selector: string;
            calldata: string[];
        }

        const prevSyncTransactions: SyncTransaction[] = await utuProvider.getSyncTxs(
            starknetProvider,
            header.height,
            0n
        );
    
        const syncTransactions: SyncTransaction[] = await utuProvider.getSyncTxs(
            starknetProvider,
            pastHeader.height,
            0n
        );
    
        // Helper function for utu relay selectors
        const checkEntrypoint = (entrypoint: string): string => {
            if (entrypoint == "0x00afd92eeac2cdc892d6323dd051eaf871b8d21df8933ce111c596038eb3afd3") {
            return "register_blocks";
            } else if (entrypoint == "0x02e486c87262b6abbb9f00f150fe22bd3fa5568adb9524d7c4f9f4e38ca17529") {
            return "update_canonical_chain";
            } else { return entrypoint };
        };
        
        //   Sync the chain before interacting with our contract
        //   Register blocks & update canonical chain 
        for (const tx of prevSyncTransactions) {
            const result = await account.execute({ 
                contractAddress: tx.contractAddress,
                entrypoint: checkEntrypoint(tx.selector),
                calldata: tx.calldata
            });
    
            await starknetProvider.waitForTransaction(result.transaction_hash);
        }
    
        for (const tx of syncTransactions) {
            const result = await account.execute({ 
                contractAddress: tx.contractAddress,
                entrypoint: checkEntrypoint(tx.selector),
                calldata: tx.calldata
            });
    
            await starknetProvider.waitForTransaction(result.transaction_hash);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
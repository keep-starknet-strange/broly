import { BlockHeader, Block, RawTransaction } from "@/BitcoinTypes";

export interface BitcoinProvider {
  getBlockHeader(blockHash: string): Promise<BlockHeader>;
  getBlock(blockHash: string): Promise<Block>;
  getBlockHash(blockHeight: number): Promise<string>;
  getTxOutProof(txids: string[], blockHash?: string): Promise<string>;
  getRawTransaction(txid: string, verbose?: boolean): Promise<RawTransaction>;
}

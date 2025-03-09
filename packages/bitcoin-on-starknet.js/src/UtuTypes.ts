import { BlockHeader } from "@/BitcoinTypes";

export interface BlockHeightProof {
  blockHeader: BlockHeader;
  rawCoinbaseTx: string;
  merkleProof: string[];
}

export interface RegisterBlocksTx {
  contractAddress: string;
  selector: string;
  calldata: string[];
}

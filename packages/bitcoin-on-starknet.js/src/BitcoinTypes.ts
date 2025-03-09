export interface BlockHeader {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash?: string;
  nextblockhash?: string;
}

export interface Block extends BlockHeader {
  strippedsize: number;
  size: number;
  weight: number;
  tx: string[];
}

export interface RawTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<{
    coinbase?: string;
    txid?: string;
    vout?: number;
    scriptSig?: {
      asm: string;
      hex: string;
    };
    sequence: number;
  }>;
  vout: Array<{
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      desc: string;
      hex: string;
      address?: string;
      type: string;
    };
  }>;
  hex: string;
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
}

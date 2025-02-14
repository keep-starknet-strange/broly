function toBigInt(hex: string): bigint {
  return BigInt("0x" + hex);
}

function splitHexString(hex: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < hex.length; i += chunkSize) {
    let chunk = hex.substring(i, i + chunkSize);
    chunk = chunk.padEnd(chunkSize, "0");
    chunks.push(chunk);
  }
  return chunks;
}

function splitHexFixed(hex: string, numChunks: number): bigint[] {
  const totalLength = hex.length;
  const chunkSize = Math.ceil(totalLength / numChunks);
  const parts: bigint[] = [];
  for (let i = 0; i < numChunks; i++) {
    let part = hex.slice(i * chunkSize, (i + 1) * chunkSize);
    part = part.padEnd(chunkSize, "0");
    parts.push(toBigInt(part));
  }
  return parts;
}

type TransactionInput = {
  coinbase: boolean;
  txid: string;
  output: number;
  sigscript: string;
  sequence: number;
  pkscript: string;
  value: number;
  address: string;
  witness: string[];
};

type TransactionOutput = {
  address: string;
  pkscript: string;
  value: number;
  spent?: boolean;
  spender?: { txid: string; input: number };
};

type Transaction = {
  txid: string;
  size: number;
  version: number;
  locktime: number;
  fee: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  block: { height: number; position: number };
  deleted: boolean;
  time: number;
  rbf: boolean;
  weight: number;
};

export function serializeKeypathTx(tx: Transaction): bigint[] {
  const result: bigint[] = [];
  const WITNESS_CHUNK_SIZE = 64;
  result.push(BigInt(tx.version));
  result.push(BigInt(tx.locktime));
  result.push(BigInt(tx.inputs.length));
  for (const input of tx.inputs) {
    if (input.witness && input.witness.length > 0) {
      result.push(BigInt(input.witness.length));
      for (const wit of input.witness) {
        const chunks = splitHexString(wit, WITNESS_CHUNK_SIZE);
        result.push(BigInt(chunks.length));
        for (const chunk of chunks) {
          result.push(toBigInt(chunk));
        }
      }
    } else {
      result.push(0n);
    }
    result.push(15n);
    result.push(BigInt(input.sequence));
    const pkChunks = splitHexFixed(input.pkscript, 8);
    for (const chunk of pkChunks) {
      result.push(chunk);
    }
  }
  result.push(BigInt(tx.outputs.length));
  for (const output of tx.outputs) {
    result.push(BigInt(output.value));
    result.push(0n);
    result.push(toBigInt(output.pkscript));
    result.push(BigInt(output.pkscript.length / 2));
  }
  for (let i = 0; i < 12; i++) {
    result.push(0n);
  }
  return result;
}
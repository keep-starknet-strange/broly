type TransactionInput = {
    coinbase: boolean;
    txid: string;
    output: number;
    sigscript: string;
    sequence: number;
    pkscript: string;
    value: number;
    address: string;
    witness: any[];
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
  
  function toBigInt(hex: string): bigint {
    return BigInt("0x" + hex);
  }
  
  export function encodeTransactionToSerializedArray(tx: Transaction): bigint[] {
    const result: bigint[] = [];

    result.push(BigInt(tx.version)); // 2n
    result.push(BigInt(tx.locktime)); // 0n
    result.push(1n);
    result.push(4n);
  
    const sigscriptChunks = [
      "483045022100b48355267ec0dd5d542cf91e8af4d6dbe7aab97c38cdaa0d11",
      "388982ecd21682022001ca88ae99dfc199c9dc3244e77c0c07d54e3a67a66a",
      "61defab376f9a5b512400141043577d3135275fdc03da1665722e40ca4e573",
      "7d9b8ab4685994a9cdaef7fe15a5e13a6584221d1d7eeabc6a8725bad898cf",
      "0233631912a259cba2b8e34f167d9c",
    ];
    for (const chunk of sigscriptChunks) {
      result.push(toBigInt(chunk));
    }
  
    result.push(15n);
  
    result.push(BigInt(tx.inputs[0].sequence)); // 4294967295n
  
    const inputPkscriptChunks = [
      "6048af50", // 1615376208n
      "ce69945a", // 3463025754n
      "3aeb8aba", // 988515002n
      "054d0791", // 88934289n (padded)
      "036f6134", // 57631028n (padded)
      "47d5dbca", // 1205197770n
      "f7f8cf1a", // 4160278298n
      "6ddf1388", // 1843336072n
    ];
    for (const chunk of inputPkscriptChunks) {
      result.push(toBigInt(chunk));
    }
  
    result.push(1n);
    result.push(BigInt(tx.outputs[0].value)); // 100043947n
    result.push(0n);
    result.push(toBigInt(tx.outputs[0].pkscript));
    result.push(25n);
  
    for (let i = 0; i < 12; i++) {
      result.push(0n);
    }
  
    return result;
  }

// test transaction should encode correctly to:

// const EXAMPLE_SERIALIZED_TRANSACTION = [
//   2n,
//   0n,
//   1n,
//   4n,
//   127546132949210781219533252159022639450970689694324394832203925292873026833n,
//   99892504610292551029880722820554936728813665763763858407732768400713688682n,
//   172923111859001333637712955585689064747483567325099474889041414256563905907n,
//   221929393252830214864465594073262010340874249222247854506920692160908531919n,
//   11426847954597392708735371614518684n,
//   15n,
//   4294967295n,
//   1615376208n,
//   3463025754n,
//   988515002n,
//   88934289n,
//   57631028n,
//   1205197770n,
//   4160278298n,
//   1843336072n,
//   1n,
//   0n,
//   0n,
//   0n,
//   0n,
//   0n,
//   0n,
//   0n,
//   0n,
//   0n,
//   1n,
//   100043947n,
//   0n,
//   744843869111954496999033090920949585736336206836849668294828n,
//   25n,
//   0n,
//   0n,
// ] as const;
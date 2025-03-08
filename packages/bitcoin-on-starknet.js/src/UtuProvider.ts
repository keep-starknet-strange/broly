import { BitcoinProvider } from "./BitcoinProvider";
import { BlockHeightProof, RegisterBlocksTx } from "@/UtuTypes";
import { BlockHeader, RawTransaction } from "./BitcoinTypes";
import { BigNumberish, ByteArray } from "starknet";
import { RpcProvider } from "starknet";
import { createHash } from "crypto";

const CONTRACT_ADDRESS =
  "0x064e21f88caa162294fdda7f73d67ad09b81419e97df3409a5eb13ba39b88c31";

// Helper function to convert to little-endian hex
export const toLittleEndianHex = (num: number): string => {
  return num.toString(16).padStart(8, "0").match(/.{2}/g)!.reverse().join("");
};

// Compute double SHA256 of a Buffer.
export const doubleSha256 = (buffer: Buffer): Buffer => {
  const hash1 = createHash("sha256").update(buffer).digest();
  const hash2 = createHash("sha256").update(hash1).digest();
  return hash2;
};

// Convert a 32-byte Buffer into an array of 8 u32 words in little-endian order.
export const bufferToU32Array = (buffer: Buffer): string[] => {
  if (buffer.length !== 32) {
    throw new Error("Buffer must be 32 bytes");
  }
  const words: string[] = [];
  // Process every 4 bytes.
  for (let i = 0; i < 32; i += 4) {
    // Read 4 bytes as a big-endian unsigned integer.
    const num = buffer.readUInt32BE(i);
    // Convert to little-endian hex using the helper.
    const leHex = toLittleEndianHex(num);
    words.push("0x" + leHex);
  }
  return words;
};

// Putting it all together: compute the double SHA256 digest as an array of 8 little-endian u32 hex strings.
export const doubleSha256Digest = (buffer: Buffer): string[] => {
  const hashBuffer = doubleSha256(buffer);
  return bufferToU32Array(hashBuffer);
};

// New helper function to serialize hash
export const serializedHash = (hash: string): string[] => {
  return hash
    .match(/.{8}/g)!
    .map((chunk) => "0x" + chunk.match(/.{2}/g)!.reverse().join(""))
    .reverse();
};

// Add this helper function near the top with other helpers
export const formatFelt = (value: BigNumberish): string => {
  if (typeof value === "string" && value.startsWith("0x")) {
    return value;
  }
  return "0x" + (typeof value === "string" ? value : value.toString(16));
};

// Helper function to reverse bytes in a hex string
const reverseBytes = (hex: string): string => {
  return hex.match(/../g)!.reverse().join("");
};

// Helper function to convert hex string to ByteArray
export const byteArrayFromHexString = (hex: string): ByteArray => {
  // Remove '0x' prefix if present
  hex = hex.replace("0x", "");

  const WORD_SIZE = 31; // Maximum bytes per word
  const data: BigNumberish[] = [];
  let currentWord = "";

  // Process pairs of hex chars (1 byte)
  for (let i = 0; i < hex.length; i += 2) {
    const byte = String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    currentWord += byte;

    // When we reach WORD_SIZE bytes, add to data array
    if (currentWord.length === WORD_SIZE) {
      data.push("0x" + Buffer.from(currentWord, "ascii").toString("hex"));
      currentWord = "";
    }
  }

  // Handle remaining bytes
  if (currentWord.length > 0) {
    return {
      data,
      pending_word: "0x" + Buffer.from(currentWord, "ascii").toString("hex"),
      pending_word_len: currentWord.length,
    };
  }

  return {
    data,
    pending_word: "0x00",
    pending_word_len: 0,
  };
};

// Add this helper function with other utility functions at the top
const isResultEmpty = (blockStatus: string[]): boolean => {
  return blockStatus.every((value: string) =>
    value.startsWith("0x")
      ? parseInt(value.slice(2), 16) === 0
      : parseInt(value, 16) === 0
  );
};

export interface UtuProviderResult {
  inclusionProof: string;
  bitcoinRelayerTx?: string;
}

export class UtuProvider {
  private bitcoinProvider: BitcoinProvider;

  constructor(bitcoinProvider: BitcoinProvider) {
    this.bitcoinProvider = bitcoinProvider;
  }

  async getBlockHeightProof(height: number): Promise<BlockHeightProof> {
    const blockHash = await this.bitcoinProvider.getBlockHash(height);
    const block = await this.bitcoinProvider.getBlock(blockHash);
    const coinbaseTransactionHash = block.tx[0];
    const fullProof = await this.bitcoinProvider.getTxOutProof(
      [coinbaseTransactionHash],
      blockHash
    );
    console.log("Full proof: ", fullProof);
    const rawTransaction = await this.bitcoinProvider.getRawTransaction(
      coinbaseTransactionHash
    );
    // Check if this is a SegWit transaction
    const isSegWit = rawTransaction.hex.substring(8, 12) === "0001";

    let cleanedRawTx = rawTransaction.hex;

    if (isSegWit) {
      // Remove marker and flag bytes (0001)
      cleanedRawTx = cleanedRawTx.substring(0, 8) + cleanedRawTx.substring(12);

      // Parse transaction components
      const txBytes = Buffer.from(cleanedRawTx, "hex");
      let offset = 4; // Skip version

      // Read input count and skip inputs
      const numInputs = txBytes[offset];
      offset++;
      for (let i = 0; i < numInputs; i++) {
        offset += 36; // Previous tx hash (32) + output index (4)
        const scriptLen = txBytes[offset];
        offset += 1 + scriptLen; // Script length + script
        offset += 4; // Sequence
      }

      // Read and skip outputs
      const numOutputs = txBytes[offset];
      offset++;
      for (let i = 0; i < numOutputs; i++) {
        offset += 8; // Value
        const scriptLen = txBytes[offset];
        offset += 1 + scriptLen; // Script length + script
      }

      // Reconstruct transaction without witness data
      cleanedRawTx =
        cleanedRawTx.substring(0, offset * 2) + cleanedRawTx.slice(-8);
    }

    const parsePartialMerkleTree = (proofHex: string): string[] => {
      const proofBytes = Buffer.from(proofHex, "hex");
      let offset = 80 + 4; // Skip 80-byte block header and 4-byte total transactions amount

      // Read number of hashes (varint)
      let numHashes = 0;
      let shift = 0;
      while (true) {
        const byte = proofBytes[offset++];
        numHashes |= (byte & 0x7f) << shift;
        if (!(byte & 0x80)) break;
        shift += 7;
      }

      // Extract hashes
      const hashes: string[] = [];
      for (let i = 0; i < numHashes; i++) {
        const hash = proofBytes
          .subarray(offset + i * 32, offset + (i + 1) * 32)
          .reverse()
          .toString("hex");
        hashes.push(hash);
      }

      return hashes;
    };

    const leftMerkleBranch = parsePartialMerkleTree(fullProof);

    console.log("Running block height proof...")
    console.log("Block: ", block);
    console.log("Cleaned Raw Tx: ", cleanedRawTx);
    console.log("leftMerkleBranch: ", leftMerkleBranch);
    console.log("leftMerkleBranch slice: ", leftMerkleBranch.slice(1));
    return {
      // because block extends BlockHeader
      blockHeader: block,
      rawCoinbaseTx: cleanedRawTx,
      merkleProof: leftMerkleBranch.slice(1),
    };
  }

  async getTxInclusionProof(txid: string): Promise<[string, boolean][]> {
    // Get the transaction's block hash and proof
    const proof = await this.bitcoinProvider.getTxOutProof([txid]);

    // Extract total transactions count (4 bytes after block header)
    const txCount = parseInt(
      proof.slice(160, 168).match(/../g)!.reverse().join(""),
      16
    );

    // Read CompactSize for number of hashes
    const [hashCount, startPosition] = this.readCompactSize(proof, 168);

    // Extract hashes
    const hashes: string[] = [];
    let position = startPosition;
    for (let i = 0; i < hashCount; i++) {
      const hash = proof.slice(position, position + 64);
      hashes.push(reverseBytes(hash));
      position += 64;
    }

    // Read flag bits
    const [flagBitsLength, flagPosition] = this.readCompactSize(
      proof,
      position
    );
    const flagBytes = proof.slice(
      flagPosition,
      flagPosition + flagBitsLength * 2
    );

    // Convert flag bytes to bits array
    const flagBits: boolean[] = [];
    for (let i = 0; i < flagBytes.length; i += 2) {
      const byte = parseInt(flagBytes.slice(i, i + 2), 16);
      for (let j = 0; j < 8; j++) {
        flagBits.push((byte & (1 << j)) !== 0);
      }
    }

    // Calculate merkle branch using tree traversal
    const merkleBranch: [string, boolean][] = [];
    let hashPos = 0;
    let flagPos = 0;

    const height = Math.ceil(Math.log2(txCount));

    // Helper function to calculate tree width at a given height
    function calcTreeWidth(height: number): number {
      return (txCount + (1 << height) - 1) >> height;
    }

    function traverse(height: number, pos: number): [string, boolean] {
      if (flagPos >= flagBits.length) {
        throw new Error("Overflowed flag bits array");
      }

      const parent = flagBits[flagPos++];

      if (height === 0 || !parent) {
        // If at height 0 or nothing interesting below, use the stored hash
        if (hashPos >= hashes.length) {
          throw new Error("Overflowed hash array");
        }
        const hash = hashes[hashPos++];
        return [hash, true];
      }

      // Otherwise, descend into the subtrees
      const [left, is_left_leaf] = traverse(height - 1, pos * 2);
      let [right, is_right_leaf] = [left, is_left_leaf]; // Default to left if no right child exists

      // Only traverse right child if it exists within the tree width
      if (pos * 2 + 1 < calcTreeWidth(height - 1)) {
        [right, is_right_leaf] = traverse(height - 1, pos * 2 + 1);
        if (right === left) {
          throw new Error("Invalid merkle proof - duplicate hash");
        }
      }

      if (is_left_leaf && left !== txid) {
        merkleBranch.push([left, true]);
      }
      if (is_right_leaf && right !== txid) {
        merkleBranch.push([right, false]);
      }

      function hashCouple(hex1: string, hex2: string): string {
        const crypto = require("crypto");
        const combined = Buffer.concat([
          Buffer.from(reverseBytes(hex1), "hex"),
          Buffer.from(reverseBytes(hex2), "hex"),
        ]);
        const firstHash = crypto.createHash("sha256").update(combined).digest();
        return reverseBytes(
          crypto.createHash("sha256").update(firstHash).digest("hex")
        );
      }

      const combined = hashCouple(left, right);
      return [combined, false];
    }

    const [_computedRoot, _] = traverse(height, 0);

    return merkleBranch;
  }

  async getCanonicalChainUpdateTx(
    beginHeight: number,
    endHeight: number,
    proof: boolean
  ) {
    const contractAddress = CONTRACT_ADDRESS;
    const selector =
      "0x02e486c87262b6abbb9f00f150fe22bd3fa5568adb9524d7c4f9f4e38ca17529";
    const firstBlockHash = await this.bitcoinProvider.getBlockHash(beginHeight);
    const lastBlockHash = await this.bitcoinProvider.getBlockHash(endHeight);
    const firstBlockHeader = await this.bitcoinProvider.getBlockHeader(
      firstBlockHash
    );

    let calldata = [
      formatFelt(beginHeight),
      formatFelt(endHeight),
      ...serializedHash(lastBlockHash),
    ];
    if (proof) {
      const proof = await this.getBlockHeightProof(beginHeight);
      // Option::Some
      calldata.push("0x0");

      // block header
      calldata.push(...this.serializeBlockHeader(firstBlockHeader));

      const byteArrayCoinbaseTx = byteArrayFromHexString(proof.rawCoinbaseTx);

      calldata.push(
        formatFelt(byteArrayCoinbaseTx.data.length),
        ...byteArrayCoinbaseTx.data.map((word) => formatFelt(word)),
        formatFelt(byteArrayCoinbaseTx.pending_word),
        formatFelt(byteArrayCoinbaseTx.pending_word_len)
      );
      // a merkleProof is basically an array of hashes (fixed size arrays)
      calldata.push(
        formatFelt(proof.merkleProof.length),
        ...proof.merkleProof.flatMap(serializedHash)
      );
    } else {
      // Option::None
      calldata.push("0x1");
    }

    return {
      contractAddress,
      selector,
      calldata,
    };
  }

  async getRegisterBlocksTx(blocks: string[]): Promise<RegisterBlocksTx> {
    const blockHeaders = await Promise.all(
      blocks.map((block) => this.bitcoinProvider.getBlockHeader(block))
    );

    return {
      contractAddress: CONTRACT_ADDRESS,
      selector:
        "0x00afd92eeac2cdc892d6323dd051eaf871b8d21df8933ce111c596038eb3afd3",
      calldata: [
        formatFelt(blocks.length),
        ...blockHeaders.flatMap((header) => this.serializeBlockHeader(header)),
      ],
    };
  }

  public serializeBlockHeader(blockHeader: BlockHeader): string[] {
    // Ensure all fields are present
    const requiredFields = [
      "version",
      "previousblockhash",
      "merkleroot",
      "time",
      "bits",
      "nonce",
    ];

    for (const field of requiredFields) {
      if (!(field in blockHeader)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Serialize each field
    const serialized = [
      formatFelt(toLittleEndianHex(blockHeader.version)),
      ...serializedHash(blockHeader.previousblockhash as string),
      ...serializedHash(blockHeader.merkleroot),
      formatFelt(toLittleEndianHex(blockHeader.time)),
      formatFelt(blockHeader.bits),
      formatFelt(toLittleEndianHex(blockHeader.nonce)),
    ];

    return serialized;
  }

  private readCompactSize(
    hex: string,
    startPosition: number
  ): [number, number] {
    const firstByte = parseInt(hex.slice(startPosition, startPosition + 2), 16);
    let value: number;
    let newPosition = startPosition;

    if (firstByte < 0xfd) {
      value = firstByte;
      newPosition += 2;
    } else if (firstByte === 0xfd) {
      value = parseInt(
        hex
          .slice(newPosition + 2, newPosition + 6)
          .match(/../g)!
          .reverse()
          .join(""),
        16
      );
      newPosition += 6;
    } else if (firstByte === 0xfe) {
      value = parseInt(
        hex
          .slice(newPosition + 2, newPosition + 10)
          .match(/../g)!
          .reverse()
          .join(""),
        16
      );
      newPosition += 10;
    } else {
      value = parseInt(
        hex
          .slice(newPosition + 2, newPosition + 18)
          .match(/../g)!
          .reverse()
          .join(""),
        16
      );
      newPosition += 18;
    }
    return [value, newPosition];
  }

  /**
   * Gets the sync transactions needed to register Bitcoin blocks on Starknet.
   * This is a simple version that only registers new blocks and does not handle
   * chain reorganizations or attempt to override an incorrect canonical chain.
   */
  async getSyncTxs(
    starknetProvider: RpcProvider,
    blockHeight: number,
    minCPOW: bigint
  ) {
    // Prepare the calls array
    const calls = [];

    // Convert bits field to target threshold and compute proof of work
    function computePOWFromBits(bits: string): bigint {
      // Convert bits to target threshold
      // Format is: 0x1d00ffff where:
      // First byte (1d) is the number of bytes
      // Next byte (00) is unused
      // Last bytes (ffff) are the significant digits
      const exponent = parseInt(bits.slice(0, 2), 16);
      const coefficient = parseInt(bits.slice(2), 16);

      // Target = coefficient * 256^(exponent-3)
      const target = BigInt(coefficient) * BigInt(256) ** BigInt(exponent - 3);

      // Compute POW as (2^256-1)/target
      const maxValue = (BigInt(1) << BigInt(256)) - BigInt(1);
      return maxValue / target;
    }

    let cPOW = 0n;
    const blocksToRegister = [];
    let canonicalRewriteMin = undefined;
    let canonicalRewriteMax = undefined;
    let currentBlockHeight = blockHeight;

    // even if we need 0 cpow, we still need at least this block
    while (cPOW < minCPOW || cPOW === 0n) {
      // Get block information
      const blockHash = await this.bitcoinProvider.getBlockHash(
        currentBlockHeight
      );
      const blockHeader = await this.bitcoinProvider.getBlockHeader(blockHash);
      cPOW += computePOWFromBits(blockHeader.bits);

      // Check if block is written
      const blockStatus = await starknetProvider.callContract({
        contractAddress: CONTRACT_ADDRESS,
        entrypoint: "get_status",
        calldata: serializedHash(blockHash),
      });
      console.log("Block status: ", blockStatus);
      if (isResultEmpty(blockStatus)) {
        blocksToRegister.push(blockHash);
        if (canonicalRewriteMin === undefined) {
          canonicalRewriteMin = currentBlockHeight;
        }
        canonicalRewriteMax = currentBlockHeight;
      } else {
        // if the block is written, we then need to check the status on the canonical chain
        const canonicalChainBlock = await starknetProvider.callContract({
          contractAddress: CONTRACT_ADDRESS,
          entrypoint: "get_block",
          calldata: ["0x" + currentBlockHeight.toString(16)],
        });
        console.log("Canonical chain block: ", canonicalChainBlock);
        // if it is not written, then we want to update it
        if (isResultEmpty(canonicalChainBlock)) {
          if (canonicalRewriteMin === undefined) {
            canonicalRewriteMin = currentBlockHeight;
          }
          canonicalRewriteMax = currentBlockHeight;
        }
      }

      currentBlockHeight += 1;
    }

    // 1. Register the block itself
    const registerBlocks = await this.getRegisterBlocksTx(blocksToRegister);
    calls.push(registerBlocks);

    // 2. Update the canonical chain to include this block
    if (canonicalRewriteMin !== undefined) {
      // we require a height proof if there is not already the prev block on the canonical chain
      const previousChainBlock = await starknetProvider.callContract({
        contractAddress: CONTRACT_ADDRESS,
        entrypoint: "get_block",
        calldata: ["0x" + (blockHeight - 1).toString(16)],
      });

      const chainUpdate = await this.getCanonicalChainUpdateTx(
        canonicalRewriteMin,
        // it is defined if min is defined
        canonicalRewriteMax as number,
        isResultEmpty(previousChainBlock)
      );
      calls.push(chainUpdate);
    }

    console.log("Calls: ", calls);
    return calls;
  }
}

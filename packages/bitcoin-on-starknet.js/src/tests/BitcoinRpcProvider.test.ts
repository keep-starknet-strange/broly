import { config } from "dotenv";
import { BitcoinRpcProvider } from "@/BitcoinRpcProvider";

config();

describe("BitcoinRpcProvider", () => {
  let provider: BitcoinRpcProvider;

  beforeEach(() => {
    provider = new BitcoinRpcProvider({
      url: process.env.BITCOIN_RPC_URL || "",
      // username: process.env.BITCOIN_RPC_USERNAME || "",
      // password: process.env.BITCOIN_RPC_PASSWORD || "",
    });
  });

  it("should get block header", async () => {
    const knownBlockHash =
      "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"; // Genesis block hash

    const result = await provider.getBlockHeader(knownBlockHash);
    expect(result).toBeDefined();
    expect(result.hash).toBe(knownBlockHash);
  });

  it("should get block hash", async () => {
    const result = await provider.getBlockHash(0);
    expect(result).toBe(
      "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
    );
  });

  it("should get tx out proof", async () => {
    const txids = [
      "0f3601a5da2f516fa9d3f80c9bf6e530f1afb0c90da73e8f8ad0630c5483afe5",
    ];
    const result = await provider.getTxOutProof(txids);
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("should get raw transaction", async () => {
    const txid =
      "0f3601a5da2f516fa9d3f80c9bf6e530f1afb0c90da73e8f8ad0630c5483afe5";
    const result = await provider.getRawTransaction(txid);
    expect(result).toBeDefined();
    expect(result.txid).toBe(txid);
  });

  it("should get block", async () => {
    const blockHash =
      "00000000000000d0dfd4c9d588d325dce4f32c1b31b7c0064cba7025a9b9adcc";
    const result = await provider.getBlock(blockHash);
    expect(result).toBeDefined();
    expect(result.hash).toBe(blockHash);
  });
});

import { BitcoinRpcProvider } from "@/BitcoinRpcProvider";
import { BitcoinProvider } from "@/BitcoinProvider";
import { BlockHeader, RawTransaction, Block } from "@/BitcoinTypes";

export class BitcoinProxiedRpcProvider extends BitcoinRpcProvider implements BitcoinProvider {
  private proxyUrl: string;

  constructor(proxyUrl: string) {
    // Pass a dummy config to parent class
    super({ url: "dummy" });
    this.proxyUrl = proxyUrl;
  }

  public async getBlockHeader(blockHash: string): Promise<BlockHeader> {
    return super.getBlockHeader(blockHash);
  }

  public async getBlock(blockHash: string): Promise<Block> {
    return super.getBlock(blockHash);
  }

  public async getBlockHash(blockHeight: number): Promise<string> {
    return super.getBlockHash(blockHeight);
  }

  public async getTxOutProof(txids: string[], blockHash?: string): Promise<string> {
    return super.getTxOutProof(txids, blockHash);
  }

  public async getRawTransaction(txid: string, verbose?: boolean): Promise<RawTransaction> {
    return super.getRawTransaction(txid);
  }

  protected override async callRpc(
    method: string,
    params: any[] = []
  ): Promise<Response> {
    const body = JSON.stringify({
      jsonrpc: "1.0",
      id: new Date().getTime(),
      method: method,
      params: params,
    });

    return fetch(this.proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });
  }
}

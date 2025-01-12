const STARTING_BLOCK = 390000;

export const config = {
  streamUrl: Deno.env.get("APIBARA_STREAM_URL"),
  startingBlock: STARTING_BLOCK,
  network: "starknet",
  finality: "DATA_STATUS_PENDING",
  filter: {
    events: [
      {
        fromAddress: Deno.env.get("BROLY_CONTRACT_ADDRESS"),
        keys: [
          "0x02206f1373fa5f0c53a9546d291d8e7389cdbee50a22dca64f02545611a91cc2",
        ],
        includeReverted: false,
        includeTransaction: false,
        includeReceipt: false
      },
    ]
  },
  sinkType: "webhook",
  sinkOptions: {
    targetUrl: Deno.env.get("CONSUMER_TARGET_URL")
  }
};

export default function transform(block) {
  return block;
}

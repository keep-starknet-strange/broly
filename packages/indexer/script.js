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
          // RequestCreation Event
          "0x02206f1373fa5f0c53a9546d291d8e7389cdbee50a22dca64f02545611a91cc2",
        ],
        includeReverted: false,
        includeTransaction: false,
        includeReceipt: false
      },
      {
        fromAddress: Deno.env.get("BROLY_CONTRACT_ADDRESS"),
        keys: [
          // RequestLocked Event
          "0x00cb8cf3a8b98da361712b27e7be452a22ec254dfa7c0b59a74dd7d111bcbe9d",
        ],
        includeReverted: false,
        includeTransaction: false,
        includeReceipt: false
      },
      {
        fromAddress: Deno.env.get("BROLY_CONTRACT_ADDRESS"),
        keys: [
          // RequestCompleted Event
          "0x0158f34f5ba2bc3f4b4aac16b288b8ea46dd0e884b0c8030a9e7313b259d8b98",
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

import { config } from "dotenv";
import { UtuProvider } from "@/UtuProvider";
import { BitcoinRpcProvider } from "@/BitcoinRpcProvider";

config();

describe("UtuProvider", () => {
  let utuProvider: UtuProvider;
  let bitcoinProvider: BitcoinRpcProvider;

  beforeAll(() => {
    bitcoinProvider = new BitcoinRpcProvider({
      url: process.env.BITCOIN_RPC_URL || "",
      // username: process.env.BITCOIN_RPC_USERNAME || "",
      // password: process.env.BITCOIN_RPC_PASSWORD || "",
    });
    utuProvider = new UtuProvider(bitcoinProvider);
  });

  it("should get block height proof for block 800000", async () => {
    const height = 800000;
    const proof = await utuProvider.getBlockHeightProof(height);

    expect(proof.blockHeader).toBeDefined();
    expect(proof.rawCoinbaseTx).toBe(
      "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff1a0300350c0120130909092009092009102cda1492140000000000ffffffff02c09911260000000017a914c3f8f898ae5cab4f4c1d597ecb0f3a81a9b146c3870000000000000000266a24aa21a9ed9fbe517a588ccaca585a868f3cf19cb6897e3c26f3351361fb28ac8509e69a7e00000000"
    );
    expect(proof.merkleProof).toEqual([
      "d41f5de48325e79070ccd3a23005f7a3b405f3ce1faa4df09f6d71770497e9d5",
      "e966899d07c2e59033c073820b2f37a11532c1d11184373c4e558d65dac475e0",
      "9f43ef264af1c3a4678d2bf5e60cddbd87b97618b1c80bd2b8a7f9b7f3baca68",
      "4befb427613b7021015030bf67472af6c76f680fadc90bc4c267a9e5804d8948",
      "bf61e05d4675710220c0b8dd669dcac9a1cbc3edb7ac64fc50410da9228333d5",
      "c88892d93e8110f2ec82c41ac30e6a3c8dfe8cf062fefb4b5c09ee754d7ce42c",
      "d4e7722bda133364a17b82990b16c3eb62f4a47d6aaae1c16bb0553806fcd3df",
      "2cbc00355a2debbb8b90dd60ab0dd520699b40e4e4ad90d546864a6e4c5087f8",
      "f2a33c753e9894eea7728206d927e830e946c4e13706275df14362398538e3db",
      "8cc2c566df38c865e0aa6ddfd46d3440e99442a6d04d567323cbe53ffa470234",
      "885cd4d205c35e05f8f738328166b9c65304583704162bcac8944b20690f696f",
      "f6d90508da8aa581f7203f4899498c775ed4878544adcdef5e7b53a4ab691dd7",
    ]);
  });

  it("should get register blocks tx for given block hashes", async () => {
    const blockHash =
      "00000000d1145790a8694403d4063f323d499e655c83426834d4ce2f8dd4a2ee";
    const registerBlocksTx = await utuProvider.getRegisterBlocksTx([blockHash]);

    expect(registerBlocksTx).toBeDefined();
    expect(registerBlocksTx.contractAddress).toBe(
      "0x064e21f88caa162294fdda7f73d67ad09b81419e97df3409a5eb13ba39b88c31"
    );
    expect(registerBlocksTx.selector).toBe(
      "0x00afd92eeac2cdc892d6323dd051eaf871b8d21df8933ce111c596038eb3afd3"
    );
    expect(registerBlocksTx.calldata).toEqual([
      "0x1",
      "0x01000000",
      "0x55bd840a",
      "0x78798ad0",
      "0xda853f68",
      "0x974f3d18",
      "0x3e2bd1db",
      "0x6a842c1f",
      "0xeecf222a",
      "0x00000000",
      "0xff104ccb",
      "0x05421ab9",
      "0x3e63f8c3",
      "0xce5c2c2e",
      "0x9dbb37de",
      "0x2764b3a3",
      "0x175c8166",
      "0x562cac7d",
      "0x51b96a49",
      "0x1d00ffff",
      "0x283e9e70",
    ]);
  });

  it("should get canonical chain update tx for a given block slice", async () => {
    const updateCanonicalChainTx = await utuProvider.getCanonicalChainUpdateTx(
      865_698,
      865_699,
      true
    );

    expect(updateCanonicalChainTx.calldata).toEqual([
      "0xd35a2",
      "0xd35a3",
      "0x105b1b4c",
      "0x7abd4abf",
      "0xf35e4b8a",
      "0x4ee0c662",
      "0x8a70cc8c",
      "0xa7e70000",
      "0x00000000",
      "0x00000000",
      "0x0",
      "0x0040b422",
      "0x04497c31",
      "0x921daa0d",
      "0xce160828",
      "0x88d96ae0",
      "0x6d4c21b5",
      "0xe8350100",
      "0x00000000",
      "0x00000000",
      "0x8747156c",
      "0xaa39781d",
      "0x2cf0292c",
      "0x5ba0243e",
      "0xfbd7f86e",
      "0x4db390a3",
      "0xddf94e99",
      "0xee949321",
      "0x90fa0d67",
      "0x17030ecd",
      "0x2a2312e7",
      "0xb",
      "0x01000000010000000000000000000000000000000000000000000000000000",
      "0x000000000000ffffffff5603a2350d194d696e656420627920416e74506f6f",
      "0x6c20e2002a00b4747806fabe6d6d710d04d1ea50a50e6329e2fa1ab865fa16",
      "0x083c12ae90926ee2d687d78e64243210000000000000000000e27011020000",
      "0x00000000ffffffff05220200000000000017a91442402a28dd61f2718a4b27",
      "0xae72a4791d5bbdade787aca64c130000000017a9145249bdf2c131d43995cf",
      "0xf42e8feee293f79297a8870000000000000000266a24aa21a9ed70918c3504",
      "0x1817b2ce38010673f3420b25a34c0480a9e53a280f7eb1b0ccffdc00000000",
      "0x000000002f6a2d434f52450164db24a662e20bbdf72d1cc6e973dbb2d12897",
      "0xd54e3ecda72cb7961caa4b541b1e322bcfe0b5a03000000000000000002b6a",
      "0x2952534b424c4f434b3a900671964dfd53207639c814270d32fbb670620e4d",
      "0xdd8821dd3d5c100067a1e300000000",
      "0xf",
      "0xd",
      "0xed1a7f4d",
      "0xd014d433",
      "0x61135d68",
      "0xcd87ac3e",
      "0x3fcdb176",
      "0x7207eada",
      "0x5841b71d",
      "0x9d3b521a",
      "0xb7385728",
      "0x88aa8fd0",
      "0x32ecc479",
      "0x85bf025d",
      "0x5845b20e",
      "0xf7f2a5c9",
      "0xa18769ed",
      "0xfcb4b0f3",
      "0xda98451b",
      "0xd164c25a",
      "0x5f344066",
      "0x4b2d928f",
      "0x8e8a5777",
      "0x1b9c6920",
      "0xd16fea50",
      "0x79f038ea",
      "0x68a9bb70",
      "0x22840ac7",
      "0x242401e0",
      "0x5b163eec",
      "0xd491a746",
      "0x76169352",
      "0x8d98d2bd",
      "0x4e668543",
      "0xabd0b481",
      "0x25f96765",
      "0x1c488cb2",
      "0x708d2af5",
      "0xd94c47fe",
      "0x1c7dea31",
      "0x3a7222a9",
      "0xbdb319fa",
      "0x19ef0283",
      "0xb73d90ad",
      "0x831fa829",
      "0x264f5b5f",
      "0x3c6b640a",
      "0x2be01324",
      "0x6672dede",
      "0x1cf4f247",
      "0x8d593a8f",
      "0xae0ca5ae",
      "0xfe2b942e",
      "0xadd272e9",
      "0xc6b72929",
      "0xe2175560",
      "0xed64e289",
      "0xa644c603",
      "0xf4e08ea5",
      "0x157937e2",
      "0xf748b7e3",
      "0xca5b4631",
      "0xd88087ba",
      "0xb2c6ce01",
      "0x7b488c35",
      "0x4bfe4150",
      "0x366d3c54",
      "0xd4cc1cdc",
      "0x1cfcbfdc",
      "0x2dfa1047",
      "0x566474be",
      "0xb8af3799",
      "0xc64a4d0a",
      "0x737fa267",
      "0x6df45507",
      "0x69bdfaa3",
      "0x7fdfa16c",
      "0x42a3fccf",
      "0xf2a3c4c1",
      "0x5afc3719",
      "0xb9255f4c",
      "0xc9d70276",
      "0xf42ae906",
      "0xc504e17d",
      "0x50d3e3e1",
      "0x321b34b7",
      "0x5a409ff8",
      "0x61506203",
      "0x9f9e556e",
      "0xeaf6c329",
      "0xa2b2c4ad",
      "0x0b65a0cd",
      "0x9f71a7aa",
      "0x5bf78839",
      "0x07059466",
      "0x1cb48c27",
      "0x4b9add9f",
      "0x3ec6d0d9",
      "0xf01e0809",
      "0xf7f82ff9",
      "0x96093cf9",
      "0xab2671f3",
      "0x8d65f3f7",
      "0x5a13bf8d",
      "0x976f697f",
      "0xce132d37",
    ]);
  });
});

use starknet::ContractAddress;
use core::array::{ToSpanTrait};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address_global,
    stop_cheat_caller_address_global, test_address, start_cheat_block_number_global,
    stop_cheat_block_number_global, start_cheat_block_timestamp,
};
use consensus::{types::transaction::{Transaction, TxIn, TxOut, OutPoint}};
use openzeppelin::presets::interfaces::{
    ERC20UpgradeableABIDispatcher, ERC20UpgradeableABIDispatcherTrait,
};
use openzeppelin::utils::serde::SerializedAppend;
use onchain::orderbook::interface::{OrderbookABIDispatcher, OrderbookABIDispatcherTrait};
use onchain::broly_utils::{constants, erc20_utils, taproot_utils};
use utils::{hex::{from_hex, hex_to_hash_rev}, hash::{Digest, DigestImpl}};
use utu_relay::{
    interfaces::{IUtuRelayDispatcher, IUtuRelayDispatcherTrait, HeightProof},
    bitcoin::block::{BlockHeader, BlockHeaderTrait, BlockHashImpl, BlockHashTrait},
    bitcoin::coinbase::get_coinbase_data,
};


fn setup_orderbook(
    erc20_contract_address: ContractAddress,
    tx_inclusion: ContractAddress,
    relay_address: ContractAddress,
) -> OrderbookABIDispatcher {
    // declare Orderbook contract
    let contract_class = declare("Orderbook").unwrap().contract_class();

    // deploy Orderbook contract
    let mut calldata = array![];
    calldata.append_serde(erc20_contract_address);
    calldata.append_serde(tx_inclusion);
    calldata.append_serde(relay_address);

    let (contract_address, _) = contract_class.deploy(@calldata).unwrap();

    OrderbookABIDispatcher { contract_address }
}

fn setup_tx_inclusion() -> (ContractAddress, IUtuRelayDispatcher) {
    // declare and deploy UtuRelay contract
    let utu_relay_contract_class = declare("UtuRelay").unwrap().contract_class();
    let (utu_relay_address, _) = utu_relay_contract_class.deploy(@ArrayTrait::new()).unwrap();

    // declare and deploy TransactionInclusion contract
    let contract_class = declare("TransactionInclusion").unwrap().contract_class();
    let mut calldata = array![];
    calldata.append_serde(utu_relay_address);
    let (tx_inclusion_address, _) = contract_class
        .deploy(@array![utu_relay_address.into()])
        .unwrap();

    (tx_inclusion_address, IUtuRelayDispatcher { contract_address: utu_relay_address })
}

fn setup() -> (
    OrderbookABIDispatcher, ERC20UpgradeableABIDispatcher, ContractAddress, IUtuRelayDispatcher,
) {
    // deploy an ERC20
    let (erc20_strk, _) = erc20_utils::setup_erc20(test_address());

    // deploy tx inclusion contract
    let (tx_inclusion_address, utu) = setup_tx_inclusion();

    // deploy Orderbook contract
    let orderbook = setup_orderbook(
        erc20_strk.contract_address, tx_inclusion_address, utu.contract_address,
    );

    (orderbook, erc20_strk, tx_inclusion_address, utu)
}


#[test]
fn test_request_inscription_stored_and_retrieved() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray =
        "bc1p5d7rjq7g6r4jdyhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address.clone(), 'STRK'.into(), 10);

    let expected = (
        test_address(), "data", 10, test_taproot_address,
    ); // the inscription data and the submitter fee
    let actual = orderbook_dispatcher.query_inscription(0);
    assert_eq!(expected, actual);

    let expected_contract_balance = 10; // the submitter fee transferred to the contract
    let actual_contract_balance = token_dispatcher
        .balance_of(orderbook_dispatcher.contract_address);
    assert_eq!(expected_contract_balance, actual_contract_balance);

    let expected_user_balance = constants::SUPPLY - 10; // the user balance after the request call
    let actual_user_balance = token_dispatcher.balance_of(test_address());
    assert_eq!(expected_user_balance, actual_user_balance);
}

#[test]
fn test_index_updates_correctly() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray =
        "bc1p5d7rjq7g6r4jdyhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address.clone(), 'STRK'.into(), 10);

    let (_, _, amount, _) = orderbook_dispatcher.query_inscription(0);
    assert_eq!(amount, 10);
    let (_, _, amount, _) = orderbook_dispatcher.query_inscription(1);
    assert_eq!(amount, 0);

    orderbook_dispatcher
        .request_inscription("more_data", test_taproot_address.clone(), 'STRK'.into(), 10);

    let (_, _, amount, _) = orderbook_dispatcher.query_inscription(1);
    assert_eq!(amount, 10);
}

#[test]
#[should_panic]
fn test_request_inscription_fails_wrong_currency() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    orderbook_dispatcher.request_inscription(test_data, test_taproot_address, 'BTC'.into(), 10);
}

#[test]
#[should_panic]
fn test_request_inscription_fails_insufficient_balance() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 2000);

    orderbook_dispatcher.request_inscription(test_data, test_taproot_address, 'STRK'.into(), 2000);
}

#[test]
fn test_lock_inscription_works() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 'STRK'.into(), 10);

    start_cheat_block_number_global(1000);
    orderbook_dispatcher.lock_inscription(id);
    stop_cheat_block_number_global();
}

#[test]
#[should_panic]
fn test_lock_inscription_fails_prior_lock_not_expired() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    start_cheat_block_number_global(10);
    let id = orderbook_dispatcher
        .request_inscription(test_data.clone(), test_taproot_address.clone(), 'STRK'.into(), 10);

    orderbook_dispatcher.lock_inscription(id);
    let (_, inscription_block) = orderbook_dispatcher.query_inscription_lock(id);
    assert_eq!(inscription_block, 10);
    stop_cheat_block_number_global();

    start_cheat_block_number_global(20);
    orderbook_dispatcher.lock_inscription(id);
    stop_cheat_block_number_global();
}

#[test]
#[should_panic]
fn test_lock_inscription_fails_inscription_not_found() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let _ = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 'STRK'.into(), 10);

    orderbook_dispatcher.lock_inscription(42);
}

#[test]
fn test_lock_inscription_fails_status_closed() { // TODO: when `submit_inscription` is implemented
}

#[test]
fn test_cancel_inscription_works() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 'STRK'.into(), 10);

    start_cheat_caller_address_global(orderbook_dispatcher.contract_address);
    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);
    stop_cheat_caller_address_global();

    orderbook_dispatcher.cancel_inscription(id, 'STRK'.into());
}

#[test]
#[should_panic]
fn test_cancel_inscription_fails_locked() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 'STRK'.into(), 10);

    orderbook_dispatcher.lock_inscription(id);
    orderbook_dispatcher.cancel_inscription(id, 'STRK'.into())
}

#[test]
fn test_cancel_inscription_fails_closed() { // TODO: when `submit_inscription` is implemented
}

#[test]
#[should_panic]
fn test_cancel_inscription_fails_canceled() {
    let (orderbook_dispatcher, token_dispatcher, _, _) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 'STRK'.into(), 10);

    start_cheat_caller_address_global(orderbook_dispatcher.contract_address);
    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);
    stop_cheat_caller_address_global();

    orderbook_dispatcher.cancel_inscription(id, 'STRK'.into());
    orderbook_dispatcher.cancel_inscription(id, 'STRK'.into());
}

#[test]
fn test_update_canonical_chain_utxo_transaction() {
    let (_, _, _, utu) = setup();

    let block_880626 = BlockHeaderTrait::new(
        537296896_u32, // version (0x20068000)
        hex_to_hash_rev(
            "000000000000000000007205a05de2a171006224505824c23a86dcc87d738105",
        ), // prev_block_hash
        hex_to_hash_rev(
            "4575bfe6a9b9043d4564b0d8f0df14556a4e4722d6310b889442ccdf4a768484",
        ), // merkle_root_hash
        1737715932_u32, // time
        0x17028c61_u32, // bits
        2703436575_u32 // nonce
    );

    // coinbase transaction a964705e8a467e721535535f8b690d76255be2b77b060b4aeffc56658b4e09c3
    let _coinbase_raw_tx = from_hex(
        "020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff3103f26f0d04dc7093672f466f756e6472792055534120506f6f6c202364726f70676f6c642f01ec967bb6d5000000000000ffffffff0522020000000000002251200f9dab1a72f7c48da8a1df2f913bef649bfc0d77072dffd11329b8048293d7a3ced0e712000000002200207086320071974eef5e72eaa01dd9096e10c0383483855ea6b344259c244f73c20000000000000000266a24aa21a9ed888eb92cbcd227955c38151a42fa3b21bedb7803e4682bac238f8c5903813cf300000000000000002f6a2d434f524501608988097efc97679e3e2f5820ea81ff7ab5c85ae6d18fda214e5b9f350ffc7b6cf3058b9026e76500000000000000002b6a2952534b424c4f434b3a0ce3cd5d34b9848234ef53efc5232c56686b15652299dc0633ac4d09006d5c5b0120000000000000000000000000000000000000000000000000000000000000000000000000",
    );

    // strip off marker flag, number of witness items on stack, length of item
    let coinbase_raw_tx_segwit = from_hex(
        "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3103f26f0d04dc7093672f466f756e6472792055534120506f6f6c202364726f70676f6c642f01ec967bb6d5000000000000ffffffff0522020000000000002251200f9dab1a72f7c48da8a1df2f913bef649bfc0d77072dffd11329b8048293d7a3ced0e712000000002200207086320071974eef5e72eaa01dd9096e10c0383483855ea6b344259c244f73c20000000000000000266a24aa21a9ed888eb92cbcd227955c38151a42fa3b21bedb7803e4682bac238f8c5903813cf300000000000000002f6a2d434f524501608988097efc97679e3e2f5820ea81ff7ab5c85ae6d18fda214e5b9f350ffc7b6cf3058b9026e76500000000000000002b6a2952534b424c4f434b3a0ce3cd5d34b9848234ef53efc5232c56686b15652299dc0633ac4d09006d5c5b00000000",
    );

    let merkle_branch = array![
        hex_to_hash_rev("685c7df2b49f43b36c17ccbb2aea37978105240560cafb1d4038451c6c4686b7"),
        hex_to_hash_rev("16e443fcc4008fb5e53946546b45dfdfc1d3195c445bc4b3063bda11d0041ebf"),
        hex_to_hash_rev("10554710f4b541253c9461b63361f51c768c5a3af3fef8e0cf4c14feb3068113"),
        hex_to_hash_rev("7dd104707f068a1defbac7166d66844ee192fc16c6334ca5170ae3a5148744c8"),
        hex_to_hash_rev("8e26bd6578c153ef3989aa90b276529133b358a50de3724b2a8c823816cc149d"),
        hex_to_hash_rev("0d72d2c3a8669f5d7bf5187dbf7f8c20f7e613bbfc8588d686d10722284e0680"),
        hex_to_hash_rev("fb7fc4e02f3515c345897c4c449ad95e34d0976717eea1098b1b80457ef82ab2"),
        hex_to_hash_rev("ae44b0310efd906236369ecb79c248a96c4aadbb33538d385956a2948bbd6f09"),
        hex_to_hash_rev("89ade3721dc2940a430bfb3605eea6139c781a87fae349ba184c29cb8edb80c0"),
        hex_to_hash_rev("ad11b8dd12cb8025d1c465800048d89f7f30413eb1aa01c6105f4a86e2602c1a"),
        hex_to_hash_rev("01654fe022244c77d7bb8308014fabe856a9497973d15e95bfea89390bbea6b3"),
        hex_to_hash_rev("6bbc0cb273bfacea3c9a1171fdd8f9ffcf219ce0e0fa235cc3cc480475d92de3"),
    ]
        .span();

    let height_proof = Option::Some(
        HeightProof {
            header: block_880626,
            coinbase_raw_tx: coinbase_raw_tx_segwit,
            merkle_branch: merkle_branch,
        },
    );

    // block hash 000000000000000000009486011ac2c8f15e12684e55c70acf54c9469483c0d6
    let u256_block_hash = u256 { high: 0x9486011ac2c8, low: 0xf15e12684e55c70acf54c9469483c0d6 };
    // assert correct digest of block header
    let digest: Digest = u256_block_hash.into();
    assert_eq!(block_880626.hash(), digest);

    utu.register_blocks(array![block_880626].span());

    let coinbase_raw_tx_segwit = from_hex(
        "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3103f26f0d04dc7093672f466f756e6472792055534120506f6f6c202364726f70676f6c642f01ec967bb6d5000000000000ffffffff0522020000000000002251200f9dab1a72f7c48da8a1df2f913bef649bfc0d77072dffd11329b8048293d7a3ced0e712000000002200207086320071974eef5e72eaa01dd9096e10c0383483855ea6b344259c244f73c20000000000000000266a24aa21a9ed888eb92cbcd227955c38151a42fa3b21bedb7803e4682bac238f8c5903813cf300000000000000002f6a2d434f524501608988097efc97679e3e2f5820ea81ff7ab5c85ae6d18fda214e5b9f350ffc7b6cf3058b9026e76500000000000000002b6a2952534b424c4f434b3a0ce3cd5d34b9848234ef53efc5232c56686b15652299dc0633ac4d09006d5c5b00000000",
    );
    let coinbase_txid_actual = get_coinbase_data(@coinbase_raw_tx_segwit).tx_id;
    let coinbase_txid_expected: Digest = hex_to_hash_rev(
        "a964705e8a467e721535535f8b690d76255be2b77b060b4aeffc56658b4e09c3",
    );

    // assert correct coinbase tx id from raw transaction
    let coinbase_digest: Digest = coinbase_txid_expected.into();
    let expected: ByteArray = coinbase_digest.into();
    let actual: ByteArray = coinbase_txid_actual.into();
    assert_eq!(expected, actual);

    utu.update_canonical_chain(880626, 880626, block_880626.hash(), height_proof);
}

#[test]
fn test_extract_p2tr_address_works() {
    let expected_address: ByteArray =
        "bc1p6h7srce4arywqss8aafu3h46zmwcugxy0y7wpv3psn09v82yg7pqn9sc28";

    let script = array![
        0x51,
        0x20,
        0xd5,
        0xfd,
        0x01,
        0xe3,
        0x35,
        0xe8,
        0xc8,
        0xe0,
        0x42,
        0x07,
        0xef,
        0x53,
        0xc8,
        0xde,
        0xba,
        0x16,
        0xdd,
        0x8e,
        0x20,
        0xc4,
        0x79,
        0x3c,
        0xe0,
        0xb2,
        0x21,
        0x84,
        0xde,
        0x56,
        0x1d,
        0x44,
        0x47,
        0x82,
    ];

    assert_eq!(taproot_utils::extract_p2tr_tweaked_pubkey(script), expected_address);
}

#[test]
fn test_submit_ord_inscription_works() {
    let (orderbook_dispatcher, token_dispatcher, tx_inclusion, utu) = setup();

    let test_taproot_address: ByteArray =
        "bc1pru8qrjr3agd6h5m0clp7xgs39yq5czh8e3dnfxphcd7szqp9agzqmlj95j";

    let test_data: ByteArray =
        "63036f7264010118746578742f706c61696e3b636861727365743d7574662d380005f09f92af0a68";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data.clone(), test_taproot_address, 'STRK'.into(), 10);

    start_cheat_caller_address_global(orderbook_dispatcher.contract_address);
    orderbook_dispatcher.lock_inscription(id);
    stop_cheat_caller_address_global();

    // tx 21a0ccbca424f8b104a3c11b1be1824eec307fda809e784bbed79f93cfe56e2d
    let tx = Transaction {
        version: 2_u32,
        is_segwit: true,
        inputs: array![
            TxIn {
                script: @from_hex(""),
                sequence: 0xfffffffd,
                previous_output: OutPoint {
                    txid: hex_to_hash_rev(
                        "28f7906e42779ef3701fe3c3428c34cd5f9585973e31ca9cba4a8f8f7d76ed29",
                    ),
                    vout: 0_u32,
                    data: TxOut {
                        value: 1380_u64,
                        pk_script: @from_hex(
                            "51208ce2a613b199a969472cd934a1f94eac31895f14f8bdd5b2e3e916e4f546cb5c",
                        ),
                        cached: false,
                    },
                    block_height: Default::default(),
                    median_time_past: Default::default(),
                    is_coinbase: false,
                },
                witness: array![
                    from_hex(
                        "d6ab9046a996ef39846f3adf6818571537fc9a2655e860f87ee0527c50c8ac51dd023a59048fa703f62dbbf1e8e1f390f5273b41dfadfa97edd52256f29ebd6b",
                    ),
                    from_hex(
                        "2075a027e1d370b5adfe7980760c48b945602e94b4a42d93e5976ba0cd9a610777ac0063036f7264010118746578742f706c61696e3b636861727365743d7574662d380005f09f92af0a68",
                    ),
                    from_hex("c075a027e1d370b5adfe7980760c48b945602e94b4a42d93e5976ba0cd9a610777"),
                ]
                    .span(),
            },
        ]
            .span(),
        outputs: array![
            TxOut {
                value: 963_u64,
                pk_script: @from_hex(
                    "51201f0e01c871ea1babd36fc7c3e3221129014c0ae7cc5b349837c37d010025ea04",
                ),
                cached: false,
            },
        ]
            .span(),
        lock_time: 0,
    };

    let siblings = array![
        (hex_to_hash_rev("07271f6f1b167c9407e6d80b82ef2b8decb0e954eda99c4041a9911d0f59642d"), true),
        (
            hex_to_hash_rev("09acb057d42d75d9d286646d5e04588868457f1791a0b54a22d44e70a0ceb238"),
            false,
        ),
        (hex_to_hash_rev("a3ac847e4a436316ece0d6eb46c42ae07c56dfcf000f3ecf0dd55c0ef71af17c"), true),
        (hex_to_hash_rev("29d6fa94034e02a24a3428148be4b417c63699864d2ed512ebf520d11e0d7615"), true),
        (
            hex_to_hash_rev("a1749d3be54b5c733da052ceac6d0bed531af09ffd2fa8639099f8f8c90f1873"),
            false,
        ),
        (
            hex_to_hash_rev("9953ae4563d6c1407327f599aa10ac5aed1146f5e51506f1e538bf4ef6bb2e68"),
            false,
        ),
        (hex_to_hash_rev("2ff427736933ba30f0f8c45e9d7e9eb3b4efc5d0ea8efeba12b9a72745f00436"), true),
        (hex_to_hash_rev("332786f8193df396c4e63f56648904377b690a9a16d7c0c3990d7f20938c1008"), true),
        (
            hex_to_hash_rev("360605677f5fedbb4c1304ed4424c4e669f1f4b2c314d868937f43d09c0d32f0"),
            false,
        ),
        (hex_to_hash_rev("41bdca866b9f32db12e58d3eddbdeb0ac26c7fdc4c7f64c02d0cc4e844a1f512"), true),
        (
            hex_to_hash_rev("8b319a82ffb44b3cf24ddb544059c0315707f6fc99a06a521520486d99c8e845"),
            false,
        ),
        (
            hex_to_hash_rev("87d570336dd9f34fd985aa55917afbe46d2377d177b08d9a4c32250e82b00f69"),
            false,
        ),
    ];

    // Check inclusion of the block containing the transfer transaction.
    let block_891353 = BlockHeaderTrait::new(
        1040187392_u32, // version (0x3e000000)
        hex_to_hash_rev(
            "00000000000000000000af0b4530d6593e927f90ca820cbb6b0bad1b7b9dfa09",
        ), // prev_block_hash
        hex_to_hash_rev(
            "9dbb0920d5ccb81e6ede7f6ad230efa79b67b43fc9b19734cc85225498068309",
        ), // merkle_root_hash
        1744034540_u32, // time
        0x17025105_u32, // bits
        3677455631_u32 // nonce
    );

    // coinbase transaction 780739a06ed0912c1a0bc75a597ab6348fb0c7c0ff340b7e2d36d2ec4f99082a
    let _coinbase_raw_tx = from_hex(
        "020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff3103d9990d04ecdaf3672f466f756e6472792055534120506f6f6c202364726f70676f6c642f38e68b77000031e461803e00ffffffff0522020000000000002251200f9dab1a72f7c48da8a1df2f913bef649bfc0d77072dffd11329b8048293d7a34f23cc12000000002200207086320071974eef5e72eaa01dd9096e10c0383483855ea6b344259c244f73c20000000000000000266a24aa21a9ed3430ec300b8666e86ca1fafac3dbbfe4f7d2b01303ca6c9b3448aa24a5dd123600000000000000002f6a2d434f524501ba57b8de67e0cf289c1ee39f1f888767003819aae6d18fda214e5b9f350ffc7b6cf3058b9026e76500000000000000002b6a2952534b424c4f434b3ad4142ed49908bee80c7e99b47676776ebb2d60c5a6eaf94ea0da751700714ae50120000000000000000000000000000000000000000000000000000000000000000000000000",
    );

    // strip off marker flag, number of witness items on stack, length of item
    let coinbase_raw_tx_segwit = from_hex(
        "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3103d9990d04ecdaf3672f466f756e6472792055534120506f6f6c202364726f70676f6c642f38e68b77000031e461803e00ffffffff0522020000000000002251200f9dab1a72f7c48da8a1df2f913bef649bfc0d77072dffd11329b8048293d7a34f23cc12000000002200207086320071974eef5e72eaa01dd9096e10c0383483855ea6b344259c244f73c20000000000000000266a24aa21a9ed3430ec300b8666e86ca1fafac3dbbfe4f7d2b01303ca6c9b3448aa24a5dd123600000000000000002f6a2d434f524501ba57b8de67e0cf289c1ee39f1f888767003819aae6d18fda214e5b9f350ffc7b6cf3058b9026e76500000000000000002b6a2952534b424c4f434b3ad4142ed49908bee80c7e99b47676776ebb2d60c5a6eaf94ea0da751700714ae500000000",
    );

    let merkle_branch = array![
        hex_to_hash_rev("3d1d78264e2b2de90165c275998b52b97830b85d301fd5eed25719a8bfa3a9ca"),
        hex_to_hash_rev("16089ec3ae55da3e9a7c63023e89857353a8dcd1381593f8f41cc4ec2d07de63"),
        hex_to_hash_rev("7d23cf543001eecc0514e98717f47b78fd2aa6a3af09d9b494c74eb385fcc659"),
        hex_to_hash_rev("b6eba046604d425a009664252ee798093ddba59c3464265faa5c753a8dcb13e9"),
        hex_to_hash_rev("1e184238e2ba25dbc174c5e66b456ba739b616a4ee45737b3e4a700831a5537d"),
        hex_to_hash_rev("97debe886f23b3727a1bb12db576ab4dcd37dd8ade6e8d3c5e15a4a93f9670d6"),
        hex_to_hash_rev("ba045a0565f8dcb4d386c7f4b2c3bbfe75f4bcc2ea0f3e28b9dba1d5f4ed40ff"),
        hex_to_hash_rev("c0dc345498e833488e7d9d4f34edd75eb182cd52fcffc34db71fb5af2612591b"),
        hex_to_hash_rev("0aca0629e0d371fcc1f8ae1477ae4d3be14ec0929b301ef17577021db1d38c30"),
        hex_to_hash_rev("a4fb29c04d81c2ab2dc82cc8af0121cef97617f3e0f0ced7e53fd9ff64d63384"),
        hex_to_hash_rev("8b319a82ffb44b3cf24ddb544059c0315707f6fc99a06a521520486d99c8e845"),
        hex_to_hash_rev("87d570336dd9f34fd985aa55917afbe46d2377d177b08d9a4c32250e82b00f69"),
    ]
        .span();

    let height_proof = Option::Some(
        HeightProof {
            header: block_891353,
            coinbase_raw_tx: coinbase_raw_tx_segwit.clone(),
            merkle_branch: merkle_branch,
        },
    );

    let block_header = block_891353;
    let inclusion_proof = siblings;
    let tx_hash: ByteArray = "21a0ccbca424f8b104a3c11b1be1824eec307fda809e784bbed79f93cfe56e2d";

    let block_headers: Array<BlockHeader> = array![block_header];
    utu.register_blocks(block_headers.span());

    let block_891353_hash = hex_to_hash_rev(
        "0000000000000000000203ba9259a1d0dcd77d7363e2170249a7efd2ce5082a8",
    );

    utu.update_canonical_chain(891353, 891353, block_891353_hash, height_proof);

    let script = array![
        0x51,
        0x20,
        0x1f,
        0x0e,
        0x01,
        0xc8,
        0x71,
        0xea,
        0x1b,
        0xab,
        0xd3,
        0x6f,
        0xc7,
        0xc3,
        0xe3,
        0x22,
        0x11,
        0x29,
        0x01,
        0x4c,
        0x0a,
        0xe7,
        0xcc,
        0x5b,
        0x34,
        0x98,
        0x37,
        0xc3,
        0x7d,
        0x01,
        0x00,
        0x25,
        0xea,
        0x04,
    ];

    let height_proof = Option::Some(
        HeightProof {
            header: block_891353,
            coinbase_raw_tx: coinbase_raw_tx_segwit,
            merkle_branch: merkle_branch,
        },
    );

    start_cheat_caller_address_global(orderbook_dispatcher.contract_address);
    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    start_cheat_block_timestamp(tx_inclusion, 1_744_034_540 + 3600); // submit after one hour
    orderbook_dispatcher
        .submit_inscription(
            id, 'STRK', tx_hash, tx, script, 891353, block_header, height_proof, inclusion_proof,
        );
    stop_cheat_caller_address_global();
}


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
fn test_submit_inscription_works() {
    let (orderbook_dispatcher, token_dispatcher, tx_inclusion, utu) = setup();

    let test_taproot_address: ByteArray =
        "bc1p6h7srce4arywqss8aafu3h46zmwcugxy0y7wpv3psn09v82yg7pqn9sc28";

    let test_data: ByteArray =
        "63036f7264010109696d6167652f706e6701020100004d360189504e470d0a1a0a0000000d494844520000000a0000000a08060000008d32cfbd000000097048597300000b1300000b1301009a9c180000000774494d4507e50c190f2b07f0fb7e270000001d69545874436f6d6d656e7400000000004372656174656420776974682047494d50642e6507000000c04944415428cf7d91310a02411085bf7322084216c31243fb20e206c806d0ccc6c256306882c90818685d0b059c8004a2b031b0085fd127d75cbb43cae7579589be7d3d22bd898c8e03e2374d98a13300934f18a05ead58c89620a16584e05e44553a992e31f85a30d0a9fe1b6acb44bf709f335cec398bc0cda90360f3301ca18397b28032de5e003823048173c180730b41c4b2ad839be82cd000ced66347bfb08751dd134c928d1a003d6cd15764c5370a65eb90000000049454e44ae4260868";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data.clone(), test_taproot_address, 'STRK'.into(), 10);

    start_cheat_caller_address_global(orderbook_dispatcher.contract_address);
    orderbook_dispatcher.lock_inscription(id);
    stop_cheat_caller_address_global();

    // tx ccfe4da8d312b18753bbf693e3014cfcfa857cf73f8f822f81a301f4f4f408d5
    let tx = Transaction {
        version: 2_u32,
        is_segwit: true,
        inputs: array![
            TxIn {
                script: @from_hex(""),
                sequence: 0xfffffffd,
                previous_output: OutPoint {
                    txid: hex_to_hash_rev(
                        "63c154a3662e417ff76247437f878496b3919e4a597d2e1b0960b05ffabb7758",
                    ),
                    vout: 0_u32,
                    data: TxOut {
                        value: 546_u64,
                        pk_script: @from_hex(
                            "51201f0e01c871ea1babd36fc7c3e3221129014c0ae7cc5b349837c37d010025ea04",
                        ),
                        cached: false,
                    },
                    block_height: Default::default(),
                    median_time_past: Default::default(),
                    is_coinbase: false,
                },
                witness: array![
                    from_hex(
                        "e5a4a1fada12c6765896a2ac1fa9d50be38db565273c76623a2d971f47eaf61f4e1ff7949c33c777351fc845e260935cf03a26e418d2e2c4bf9c31dd4cf0fb9e",
                    ),
                ]
                    .span(),
            },
            TxIn {
                script: @from_hex("160014e7856c9701014deb75a777a4eafd31db4b63252a"),
                sequence: 0xfffffffd,
                previous_output: OutPoint {
                    txid: hex_to_hash_rev(
                        "f80f183eddc312812158eb3b88f4e668a6ea8f48d16ddb2f4198805e709bdce6",
                    ),
                    vout: 2_u32,
                    data: TxOut {
                        value: 15630_u64,
                        pk_script: @from_hex("a914543c330b5c8fa2e4843f0f52ac4a8a3882bbc9bb87"),
                        cached: false,
                    },
                    block_height: Default::default(),
                    median_time_past: Default::default(),
                    is_coinbase: false,
                },
                witness: array![
                    from_hex(
                        "304402202ff12329596bb189599e5c622a9dcd12bff22d439047d8f75d3b6443233c3d4202207408c74b032d2b230a1f104028b7a93134815e48361345602c2034d81a032e6f01",
                    ),
                    from_hex("03ad555f65db5151ba551d22394c86cca6eee38f1934d30b1aab08e92cb643943c"),
                ]
                    .span(),
            },
        ]
            .span(),
        outputs: array![
            TxOut {
                value: 546_u64,
                pk_script: @from_hex(
                    "5120d5fd01e335e8c8e04207ef53c8deba16dd8e20c4793ce0b22184de561d444782",
                ),
                cached: false,
            },
            TxOut {
                value: 14694_u64,
                pk_script: @from_hex("a914543c330b5c8fa2e4843f0f52ac4a8a3882bbc9bb87"),
                cached: false,
            },
        ]
            .span(),
        lock_time: 0,
    };

    let siblings = array![
        (hex_to_hash_rev("098ba8ee4b85661b1fa5702e3a918fb323667bae2be78a7c9184a3fc6093f2d4"), true),
        (hex_to_hash_rev("e21627cb03b74ee5d37239cfe43a1aefcde98cb294758952ab792a667dcb4597"), true),
        (hex_to_hash_rev("1bfdf5e6feb454a7634ff0045ff7e04f41a33332dea1603e2c29c98728d0ea30"), true),
        (
            hex_to_hash_rev("b5e6cc1653e28ff52b38eff6055932c2de4e7d77f984bdd403bcf65aad2d018a"),
            false,
        ),
        (
            hex_to_hash_rev("5f1d916622f1df99b9c657a1c129319260e1adef98e5b7915e9b8aad4a5abc91"),
            false,
        ),
        (hex_to_hash_rev("1269df078fcd91d480071456b827e62b3055f343376149037e94051cae3f3eca"), true),
        (hex_to_hash_rev("4bce5d72d4125e937ccf7d516505b9251ddf122a79c253d70261cdd27077ef4c"), true),
        (hex_to_hash_rev("95a6708ae8937de06573ac771f6af0fae7bcd08fd195790136886ce3dfa1fa17"), true),
        (
            hex_to_hash_rev("a00e119d3058d7653ffd7cab988fc00dee8dc04059f3b36533e06ab799fa8279"),
            false,
        ),
        (hex_to_hash_rev("a9788db2ccc8f318b86ca31dd6dbd460589dd8b44f7162f24ca39189c61aea74"), true),
        (
            hex_to_hash_rev("1ea0d2a54cb53be72065da10fe3da9b80bb708ea020531bae0439d50f7cb5d0e"),
            false,
        ),
        (
            hex_to_hash_rev("effaa21235c8baa9a06e7e0baa0f52cd461dff2b1a0fca7a563637265bcfe0b6"),
            false,
        ),
    ];

    // Check inclusion of the block containing the transfer transaction.
    let block_883305 = BlockHeaderTrait::new(
        538288128_u32, // version (0x2015a000)
        hex_to_hash_rev(
            "000000000000000000003067bad6242aa54f30e9342dd8a88dea17827830ef10",
        ), // prev_block_hash
        hex_to_hash_rev(
            "eec8543200a56138974899f232058bb5d305aa197675fea2761e7f6e5a616f9b",
        ), // merkle_root_hash
        1739277179_u32, // time
        0x17027726_u32, // bits
        3927794448_u32 // nonce
    );

    // coinbase transaction 5e6a9a077f713c08dc9b0330b0c73a9004a6af691b3a359228ac702f9e4886ea
    let _coinbase_raw_tx = from_hex(
        "010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff5803697a0d1b4d696e656420627920416e74506f6f6c3837333a000100b3d87cc5fabe6d6da869f196619989d63435305d7218a8bc6aeb753162afc142629a873c0e130dd51000000000000000659c000038ce000000000000ffffffff06220200000000000017a91442402a28dd61f2718a4b27ae72a4791d5bbdade787f2b1cc120000000017a9145249bdf2c131d43995cff42e8feee293f79297a8870000000000000000266a24aa21a9edea9821c8dc6118039a39104de0fa6fffabb8ac4b4cb9a7bc0ecbe4888fdb769900000000000000002f6a2d434f524501a21cbd3caa4fe89bccd1d716c92ce4533e4d47334e3ecda72cb7961caa4b541b1e322bcfe0b5a0300000000000000000146a12455853415401000d130f0e0e0b041f12001300000000000000002b6a2952534b424c4f434b3a719099d9476e42fec4bd18c537155c6ca00bdab9ac46b5c27b0f0710006e57b70120000000000000000000000000000000000000000000000000000000000000000000000000",
    );

    // strip off marker flag, number of witness items on stack, length of item
    let coinbase_raw_tx_segwit = from_hex(
        "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff5803697a0d1b4d696e656420627920416e74506f6f6c3837333a000100b3d87cc5fabe6d6da869f196619989d63435305d7218a8bc6aeb753162afc142629a873c0e130dd51000000000000000659c000038ce000000000000ffffffff06220200000000000017a91442402a28dd61f2718a4b27ae72a4791d5bbdade787f2b1cc120000000017a9145249bdf2c131d43995cff42e8feee293f79297a8870000000000000000266a24aa21a9edea9821c8dc6118039a39104de0fa6fffabb8ac4b4cb9a7bc0ecbe4888fdb769900000000000000002f6a2d434f524501a21cbd3caa4fe89bccd1d716c92ce4533e4d47334e3ecda72cb7961caa4b541b1e322bcfe0b5a0300000000000000000146a12455853415401000d130f0e0e0b041f12001300000000000000002b6a2952534b424c4f434b3a719099d9476e42fec4bd18c537155c6ca00bdab9ac46b5c27b0f0710006e57b700000000",
    );

    let merkle_branch = array![
        hex_to_hash_rev("825c43cc5ae057986c84761988d56aeb344239a0e88a895a9f6e3d88d611ddd8"),
        hex_to_hash_rev("0efcbf6a17f20d82b5033ee9f6cdf8a122a2932b442753c1d9ceb1ea7bb56e82"),
        hex_to_hash_rev("136df8d82e5d93f5ae8a79c1d9f45f14f2907975a5966a8048969d6af9d02a80"),
        hex_to_hash_rev("1bf16b452a88aacc6b4e0023d2b08b874e3f71b81559cccdf1ea6b596ac3da40"),
        hex_to_hash_rev("25fed200499a2c8b912b82a6ba68deb8f6c846b6790f165605b2d7a5d851733b"),
        hex_to_hash_rev("3c94a63c26e4414869675cd4250fbb32b6c833067c3b07a88d0267c4571b3a42"),
        hex_to_hash_rev("8e606a716e076c920f02d71c0e2405cdee59b59c55866e2eb2621436fc7b1b0f"),
        hex_to_hash_rev("cc8fb95143fe9335a64e49da3789b63ec299a6abb4e59dc5e5140c2d50f3b751"),
        hex_to_hash_rev("5b1217a7a0751d58aa1316584428dcf061e1d6ee3640939bfde709ec5871928b"),
        hex_to_hash_rev("0018023b8fba00674908b895bbcc3a359d1013518b54881f36f41c88aec11461"),
        hex_to_hash_rev("1ea0d2a54cb53be72065da10fe3da9b80bb708ea020531bae0439d50f7cb5d0e"),
        hex_to_hash_rev("effaa21235c8baa9a06e7e0baa0f52cd461dff2b1a0fca7a563637265bcfe0b6"),
    ]
        .span();

    let height_proof = Option::Some(
        HeightProof {
            header: block_883305,
            coinbase_raw_tx: coinbase_raw_tx_segwit.clone(),
            merkle_branch: merkle_branch,
        },
    );

    // previous tx 63c154a3662e417ff76247437f878496b3919e4a597d2e1b0960b05ffabb7758
    let prev_tx = Transaction {
        version: 2_u32,
        is_segwit: true,
        inputs: array![
            TxIn {
                script: @from_hex(""),
                sequence: 0xffffffff,
                previous_output: OutPoint {
                    txid: hex_to_hash_rev(
                        "f80f183eddc312812158eb3b88f4e668a6ea8f48d16ddb2f4198805e709bdce6",
                    ),
                    vout: 0,
                    data: TxOut {
                        value: 1185_u64,
                        pk_script: @from_hex(
                            "5120ddc12d69a115788e9d002cb5a8146d070ff2d10e4fabc3f19cc732d89d9a4af2",
                        ),
                        cached: false,
                    },
                    block_height: Default::default(),
                    median_time_past: Default::default(),
                    is_coinbase: false,
                },
                witness: array![
                    from_hex(
                        "fb86c579e25eb63123e6094d994af835cca28889747941018709fbfdd3fa82c174819887de5cd38a7faf00d985c8fa711283f9c033e3a1be7588f742751e7c67",
                    ),
                    from_hex(
                        "20aa2b0b50292c3b2fa1eefb846f0bc9957142f2f143f9f3619ae74dae2f68caf2ac0063036f7264010109696d6167652f706e6701020100004d360189504e470d0a1a0a0000000d494844520000000a0000000a08060000008d32cfbd000000097048597300000b1300000b1301009a9c180000000774494d4507e50c190f2b07f0fb7e270000001d69545874436f6d6d656e7400000000004372656174656420776974682047494d50642e6507000000c04944415428cf7d91310a02411085bf7322084216c31243fb20e206c806d0ccc6c256306882c90818685d0b059c8004a2b031b0085fd127d75cbb43cae7579589be7d3d22bd898c8e03e2374d98a13300934f18a05ead58c89620a16584e05e44553a992e31f85a30d0a9fe1b6acb44bf709f335cec398bc0cda90360f3301ca18397b28032de5e003823048173c180730b41c4b2ad839be82cd000ced66347bfb08751dd134c928d1a003d6cd15764c5370a65eb90000000049454e44ae4260868",
                    ),
                    from_hex("c150929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0"),
                ]
                    .span(),
            },
        ]
            .span(),
        outputs: array![
            TxOut {
                value: 546_u64,
                pk_script: @from_hex(
                    "51201f0e01c871ea1babd36fc7c3e3221129014c0ae7cc5b349837c37d010025ea04",
                ),
                cached: false,
            },
        ]
            .span(),
        lock_time: 0,
    };

    let prev_siblings = array![
        (
            hex_to_hash_rev("a4476e9298af72e0698e279f0237d2d4aba015a2524137b16bf630db659a215d"),
            false,
        ),
        (hex_to_hash_rev("ad83b96f0a60e07e0ff79ab50ac3f743d28b6c07010374623509672d07e4eb8b"), true),
        (
            hex_to_hash_rev("1729f1de54e43110143820391c25caf82d69b29cf86bc96999498b3f0ab01319"),
            false,
        ),
        (hex_to_hash_rev("5f0d9ee9f7e3b2cbaad6de59c69871a5dc5e2e8c75bb8c260e00e7c4bc834cb4"), true),
        (
            hex_to_hash_rev("837ba96a808a045eb3fcb08515e10c0666e5f83463e7ffb27f042414bab3efa3"),
            false,
        ),
        (
            hex_to_hash_rev("3db865de63cfcd3d905e6e3647220b06d0ada1508a9917f42b9259c61fe82d4f"),
            false,
        ),
        (
            hex_to_hash_rev("74f96affc83300ec204d1dfb946c2dadc92b37afa5bc1c2651bf9ef436eff7fe"),
            false,
        ),
        (
            hex_to_hash_rev("64a17fbc355d87b3fa78587f19122369cdefb69bc79ca2d885c915819a0ea5a8"),
            false,
        ),
        (hex_to_hash_rev("f217a2a9d1c25f0affdf50ff88759502cfb2665307a41b17d9abb4a5c87a4602"), true),
        (
            hex_to_hash_rev("5f5eb5a35aafd777cafb0045cdb87a2d755aab30eef5a198a83c6b4c339c4016"),
            false,
        ),
        (
            hex_to_hash_rev("6fd8517718faee8ff2dc52cceac15dede8719234e37b4acaa1eb983bffa82d69"),
            false,
        ),
    ];

    // Check inclusion of the block containing the creation transaction.
    let block_883300 = BlockHeaderTrait::new(
        703045632_u32, // version (0x29e7a000)
        hex_to_hash_rev(
            "00000000000000000001e74b07b30360f24c9097caebfda67b2d8ab0fdc01ff4",
        ), // prev_block_hash
        hex_to_hash_rev(
            "2ae6eebe47030e360b0c822dfa440a563564a0e8001f7276e1f06e9e7ecb0e46",
        ), // merkle_root_hash
        1739274835_u32, // time
        0x17027726_u32, // bits
        1787480404_u32 // nonce
    );

    // coinbase transaction db3f1e0ad7ace7fa6ed551147baa74e94f33aab2b61596902359c16879b3069f
    let _prev_coinbase_raw_tx = from_hex(
        "020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff3103647a0d04533aab672f466f756e6472792055534120506f6f6c202364726f70676f6c642f1278d9c6ce20000000000000ffffffff0522020000000000002251200f9dab1a72f7c48da8a1df2f913bef649bfc0d77072dffd11329b8048293d7a388bbcb12000000002200207086320071974eef5e72eaa01dd9096e10c0383483855ea6b344259c244f73c20000000000000000266a24aa21a9edbd1c68ccdf460b4425046633bdee5b32ae390715ed33488c58ff5de837dbeb1f00000000000000002f6a2d434f52450158d8efc838d2de558eedeabce631c7dff92c947ae6d18fda214e5b9f350ffc7b6cf3058b9026e76500000000000000002b6a2952534b424c4f434b3aa00c8116ce62a0a432bd6fa88560e7f0b737b5e346b5c27b0f07d00f006e57560120000000000000000000000000000000000000000000000000000000000000000000000000",
    );

    // strip off marker flag, number of witness items on stack, length of item
    let prev_coinbase_raw_tx_segwit = from_hex(
        "02000000010000000000000000000000000000000000000000000000000000000000000000ffffffff3103647a0d04533aab672f466f756e6472792055534120506f6f6c202364726f70676f6c642f1278d9c6ce20000000000000ffffffff0522020000000000002251200f9dab1a72f7c48da8a1df2f913bef649bfc0d77072dffd11329b8048293d7a388bbcb12000000002200207086320071974eef5e72eaa01dd9096e10c0383483855ea6b344259c244f73c20000000000000000266a24aa21a9edbd1c68ccdf460b4425046633bdee5b32ae390715ed33488c58ff5de837dbeb1f00000000000000002f6a2d434f52450158d8efc838d2de558eedeabce631c7dff92c947ae6d18fda214e5b9f350ffc7b6cf3058b9026e76500000000000000002b6a2952534b424c4f434b3aa00c8116ce62a0a432bd6fa88560e7f0b737b5e346b5c27b0f07d00f006e575600000000",
    );

    let prev_merkle_branch = array![
        hex_to_hash_rev("7f56b7fe570790ac18d85e44a14a4fff3f7d642a589c13f463c211abfd424faa"),
        hex_to_hash_rev("76e8559e810a05cc75913115013d16947d709ea39c58e5d1cb262779dae5f2ed"),
        hex_to_hash_rev("e32ef152263e9f5443c2d8ae95405f284decbfaad22918b5c68fea58c611cd28"),
        hex_to_hash_rev("0f2dc713a2ccad0bad229d851e3d4d6b7abc1bdb8d2675e12624cf5fad284ad7"),
        hex_to_hash_rev("02f57be11cb8a80787b007fd362b8be2bbef728cf92580b27f050e55667a47ba"),
        hex_to_hash_rev("1bbd1174a59bc49bf84064b82fe0e94a57624e884d5a9f5cbf0e0d9220acbe8b"),
        hex_to_hash_rev("c2b9b8cf14e8c8d479a93ec6436bdd68f396308dbb9d78fe9267dcb1ced42104"),
        hex_to_hash_rev("8585a339c3a47a3a6da68bcbfc7cbf2a7bdeb27eef016809424067adeaaeaca6"),
        hex_to_hash_rev("c3694c9c984704d2c7202301aeedecee2cb11bff964a8c28a3b444997a1653c1"),
        hex_to_hash_rev("5f5eb5a35aafd777cafb0045cdb87a2d755aab30eef5a198a83c6b4c339c4016"),
        hex_to_hash_rev("6fd8517718faee8ff2dc52cceac15dede8719234e37b4acaa1eb983bffa82d69"),
    ]
        .span();

    let prev_height_proof = Option::Some(
        HeightProof {
            header: block_883300,
            coinbase_raw_tx: prev_coinbase_raw_tx_segwit.clone(),
            merkle_branch: prev_merkle_branch,
        },
    );

    let block_header = block_883305;
    let inclusion_proof = siblings;
    let tx_hash: ByteArray = "ccfe4da8d312b18753bbf693e3014cfcfa857cf73f8f822f81a301f4f4f408d5";

    let prev_block_header = block_883300;
    let prev_inclusion_proof = prev_siblings;
    let prev_tx_hash: ByteArray =
        "63c154a3662e417ff76247437f878496b3919e4a597d2e1b0960b05ffabb7758";

    let block_headers: Array<BlockHeader> = array![block_header, prev_block_header];
    utu.register_blocks(block_headers.span());

    let block_883300_hash = hex_to_hash_rev(
        "000000000000000000003014df89bab44479dc5961c8bda471c53cb80e7573cd",
    );

    let block_883305_hash = hex_to_hash_rev(
        "000000000000000000016e1c96f759f93d3f2ed26d5941a8b933da94408937fb",
    );

    utu.update_canonical_chain(883300, 883300, block_883300_hash, prev_height_proof);
    utu.update_canonical_chain(883305, 883305, block_883305_hash, height_proof);

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

    let height_proof = Option::Some(
        HeightProof {
            header: block_883305,
            coinbase_raw_tx: coinbase_raw_tx_segwit,
            merkle_branch: merkle_branch,
        },
    );

    let prev_height_proof = Option::Some(
        HeightProof {
            header: block_883300,
            coinbase_raw_tx: prev_coinbase_raw_tx_segwit,
            merkle_branch: prev_merkle_branch,
        },
    );

    start_cheat_caller_address_global(orderbook_dispatcher.contract_address);
    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    start_cheat_block_timestamp(tx_inclusion, 1_739_277_179 + 3600); // submit after one hour
    orderbook_dispatcher
        .submit_inscription(
            id,
            'STRK',
            tx_hash,
            prev_tx_hash,
            tx,
            prev_tx,
            script,
            883305,
            883300,
            block_header,
            prev_block_header,
            height_proof,
            prev_height_proof,
            inclusion_proof,
            prev_inclusion_proof,
        );
    stop_cheat_caller_address_global();
}

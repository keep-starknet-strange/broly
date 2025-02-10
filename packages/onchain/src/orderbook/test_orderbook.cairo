use starknet::ContractAddress;
use core::array::ToSpanTrait;
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
use onchain::utils::{constants, erc20_utils};
use utils::{hex::{from_hex, hex_to_hash_rev}, hash::{Digest, DigestImpl}};
use utu_relay::{
    interfaces::{IUtuRelayDispatcher, IUtuRelayDispatcherTrait, HeightProof},
    bitcoin::block::{BlockHeader, BlockHeaderTrait, BlockHashImpl, BlockHashTrait},
    bitcoin::coinbase::get_coinbase_data,
};


fn setup_orderbook(
    erc20_contract_address: ContractAddress, relay_address: ContractAddress,
) -> OrderbookABIDispatcher {
    // declare Orderbook contract
    let contract_class = declare("Orderbook").unwrap().contract_class();

    // deploy Orderbook contract
    let mut calldata = array![];
    calldata.append_serde(erc20_contract_address);
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
    let orderbook = setup_orderbook(erc20_strk.contract_address, tx_inclusion_address);

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
    // TODO: is this the correct way to set permissions?
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

// TODO: uncomment test when transaction is replaced with a Taproot transaction
#[test]
fn test_submit_inscription_works() {
    // TODO: this test only verifies the inclusion of some Bitcoin transaction.
    // Replace later with an actual transaction that inscribes correct data.
    let (orderbook_dispatcher, token_dispatcher, tx_inclusion, utu) = setup();

    let test_taproot_address: ByteArray =
        "5120d5fd01e335e8c8e04207ef53c8deba16dd8e20c4793ce0b22184de561d444782";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 'STRK'.into(), 10);

    orderbook_dispatcher.lock_inscription(id);

    // tx 79c91b595ef08490eff1805cd368eb54ec2d0d82b9e5cc4600ca5484f687f5d3
    let tx = Transaction {
        version: 2_u32,
        is_segwit: true,
        inputs: array![
            TxIn {
                script: @from_hex(""),
                sequence: 0xfffffffd,
                previous_output: OutPoint {
                    txid: hex_to_hash_rev(
                        "6352425c7a5130352e41c8029b89f774da43a9792a80fc68aebeebb6fb0c3326",
                    ),
                    vout: 1_u32,
                    data: TxOut {
                        value: 546_u64,
                        pk_script: @from_hex(
                            "51201f0e01c871ea1babd36fc7c3e3221129014c0ae7cc5b349837c37d010025ea04",
                        ),
                        cached: false,
                    },
                    block_height: 880625,
                    median_time_past: 1737710317,
                    is_coinbase: false,
                },
                witness: array![
                    from_hex(
                        "5c825367aa15ee6ce494ff25788dc8b96620f108f2fa135ebf271e841ad3f5a6b9bf907a47abf4a2fceda632dc52f9cd155b5eb109fdcf8264f4e057db49fa22",
                    ),
                ]
                    .span(),
            },
            TxIn {
                script: @from_hex("160014e7856c9701014deb75a777a4eafd31db4b63252a"),
                sequence: 0xfffffffd,
                previous_output: OutPoint {
                    txid: hex_to_hash_rev(
                        "6352425c7a5130352e41c8029b89f774da43a9792a80fc68aebeebb6fb0c3326",
                    ),
                    vout: 6_u32,
                    data: TxOut {
                        value: 20897_u64,
                        pk_script: @from_hex("a914543c330b5c8fa2e4843f0f52ac4a8a3882bbc9bb87"),
                        cached: false,
                    },
                    block_height: 880625,
                    median_time_past: 1737710317,
                    is_coinbase: false,
                },
                witness: array![
                    from_hex(
                        "3045022100fb445735445d6b4d94f341eece7cb0e66ac848364323ada4fa89b3a6cd50d50902206a40e8f23bf7ca288de437ca5be5b2a817574f8cd0d245afe0da301e6b697c8301",
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
                value: 19493_u64,
                pk_script: @from_hex("a914543c330b5c8fa2e4843f0f52ac4a8a3882bbc9bb87"),
                cached: false,
            },
        ]
            .span(),
        lock_time: 0,
    };

    let siblings = array![
        (
            hex_to_hash_rev("76e3e8b317c545d79ce1d1757677ec82111cd9470c402079d8551e14642809d4"),
            false,
        ),
        (
            hex_to_hash_rev("00eba47c25e16ba5b8b806a1bbcee5c04dd1ca61c1084be42104f0b03cae1f90"),
            false,
        ),
        (
            hex_to_hash_rev("a2f7d14b4f7d7bc1563f5c27dc5755aeecdbffa4def6a96f6f5f360e4f44c9a8"),
            false,
        ),
        (
            hex_to_hash_rev("ecb7a50da43f7a965404cdfc153c41cc8290d42adc0ec6b375f5a6d4bfa66c96"),
            false,
        ),
        (hex_to_hash_rev("8926a1ae808a95fdaf52e47cd41c27b54e5608def744952df23a8199b7f594d9"), true),
        (hex_to_hash_rev("4bb567de383734312006634e4ac98210a47cd4b878c31e293ddfd59407c57963"), true),
        (hex_to_hash_rev("b9ede48e3e21f5e33ea86eb37ad48888ef60da9f81cfba0e900f0592a6376fbe"), true),
        (hex_to_hash_rev("936c439349f841566d74e16bebaf24b9701032f4f318fb355879a680135ed152"), true),
        (hex_to_hash_rev("2283fad85f5f5b38679393035437d627096157001f75147c037a03f7bb78529a"), true),
        (
            hex_to_hash_rev("ad11b8dd12cb8025d1c465800048d89f7f30413eb1aa01c6105f4a86e2602c1a"),
            false,
        ),
        (
            hex_to_hash_rev("01654fe022244c77d7bb8308014fabe856a9497973d15e95bfea89390bbea6b3"),
            false,
        ),
        (
            hex_to_hash_rev("6bbc0cb273bfacea3c9a1171fdd8f9ffcf219ce0e0fa235cc3cc480475d92de3"),
            false,
        ),
    ];

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

    utu.register_blocks(array![block_880626].span());
    utu.update_canonical_chain(880626, 880626, block_880626.hash(), height_proof);
    // TODO: fix the bech32m address check
// let block_header = block_880626;
// let inclusion_proof = siblings;
// let tx_hash: ByteArray = "79c91b595ef08490eff1805cd368eb54ec2d0d82b9e5cc4600ca5484f687f5d3";

    // start_cheat_block_timestamp(tx_inclusion, 1_737_715_932 + 3600); // submit after one hour
// orderbook_dispatcher.submit_inscription(
//     id,
//     tx_hash,
//     tx,
//     880626,
//     block_header,
//     inclusion_proof
// );
}


use starknet::ContractAddress;
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
use utils::{hex::{from_hex, hex_to_hash_rev}, hash::DigestImpl};
use utu_relay::{
    interfaces::{IUtuRelayDispatcher, IUtuRelayDispatcherTrait, HeightProof},
    bitcoin::block::{BlockHeaderTrait, BlockHashImpl},
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
// TODO: uncomment test when transaction is replaced with a Taproot transaction
// #[test]
// fn test_submit_inscription_works() {
//     // TODO: this test only verifies the inclusion of some Bitcoin transaction.
//     // Replace later with an actual transaction that inscribes correct data.
//     let (orderbook_dispatcher, token_dispatcher, tx_inclusion, utu) = setup();

//     let test_taproot_address: ByteArray = "test";
//     let test_data: ByteArray = "data";

//     token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

//     let id = orderbook_dispatcher
//         .request_inscription(test_data, test_taproot_address, 'STRK'.into(), 10);

//     orderbook_dispatcher.lock_inscription(id);

//     // tx fa89c32152bf324cd1d47d48187f977c7e0f380f6f78132c187ce27923f62fcc
//     let tx = Transaction {
//         version: 2_u32,
//         is_segwit: false,
//         inputs: array![
//             TxIn {
//                 script: @from_hex(
//                     "483045022100b48355267ec0dd5d542cf91e8af4d6dbe7aab97c38cdaa0d11388982ecd21682022001ca88ae99dfc199c9dc3244e77c0c07d54e3a67a66a61defab376f9a5b512400141043577d3135275fdc03da1665722e40ca4e5737d9b8ab4685994a9cdaef7fe15a5e13a6584221d1d7eeabc6a8725bad898cf0233631912a259cba2b8e34f167d9c",
//                 ),
//                 sequence: 0xffffffff,
//                 previous_output: OutPoint {
//                     txid: hex_to_hash_rev(
//                         "8813df6d1acff8f7cadbd54734616f0391074d05ba8aeb3a5a9469ce50af4860",
//                     ),
//                     vout: 1_u32,
//                     data: Default::default(),
//                     block_height: Default::default(),
//                     median_time_past: Default::default(),
//                     is_coinbase: false,
//                 },
//                 witness: array![].span(),
//             },
//         ]
//             .span(),
//         outputs: array![
//             TxOut {
//                 value: 100043947_u64, // 1.00043947 BTC in satoshis
//                 pk_script: @from_hex("76a914d7e4161c4e2d4a5cd559d8accf208a2df867873088ac"),
//                 cached: false,
//             },
//         ]
//             .span(),
//         lock_time: 0,
//     };

//     let siblings = array![
//         (hex_to_hash_rev("51062a1510fc7ebc1d673412524b7073bb5175681e91f2fc892269aa65bfeaa7"),
//         true), (
//             hex_to_hash_rev("c15911a240d89d1c8a573076e196430ceda007876ca90c519e4a7f6ff79739e0"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("2d8485381c1c75e7cc1c52b069624a8af7fd0e5e981b2d9ea61ed38e774a9f20"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("8fb144635252fd1be34ef99355fdd2fa2c78e625faf746f66ad10af5a21b7a5c"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("849bff3bc184ae0df0b3d3bb560a68186cb711eb3a83dbfa890a4e6cc2487a47"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("c3e238ef8453b701b200ad05c5fbf88e2928589be3a3808687e1e2dd3d540170"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("82efe04d29ce3f27e71df0d496b24ec420b193d38e6e2c6b9dc126c08aad31cf"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("749d481a6c62fb88d3cf7a768cc50bbc02e8968d5e1151222ee939c87b4ade7c"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("f22343dd5c840c82a12afb0f0961dfebd73f568783cdfb5d9bd7531095922b04"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("3a23346a49a08e95cca72b16f93bb92aa115e66343b8ca58deba4fe02f52c397"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("c05714916a7088e105377682944fc1d04c295c378b560f2a643a2a584a706b98"),
//             false,
//         ),
//         (
//             hex_to_hash_rev("0e962a3c3aa944fa042e035851b2aa3c2c4a5173344684e7c2291ead8940a2b7"),
//             false,
//         ),
//     ];

//     let block_868239 = BlockHeaderTrait::new(
//         744677376_u32, // version (0x2c62e000)
//         hex_to_hash_rev(
//             "00000000000000000001f9fb950ed8f038fd2cc7330de564ba35c30fc5a7683e",
//         ), // prev_block_hash
//         hex_to_hash_rev(
//             "178d1d365faba2ca73698bce4bd4abf69a19b56047c910c00ac403d3bfe9c31f",
//         ), // merkle_root_hash
//         1730373503_u32, // time
//         0x1702f128_u32, // bits
//         3748435122_u32 // nonce
//     );

//     let coinbase_raw_tx = from_hex(
//         "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff56038f3f0d194d696e656420627920416e74506f6f6c2021000f0465ccbb9dfabe6d6d07cf5e92a794c3e9c45e6bacf77e99d91c0e84e28405b04689c16c85ec82c28c10000000000000000000a69f22345e0100000000ffffffff05220200000000000017a91442402a28dd61f2718a4b27ae72a4791d5bbdade787ee323b130000000017a9145249bdf2c131d43995cff42e8feee293f79297a8870000000000000000266a24aa21a9ed882945dcdbaa7c817c5f0dfb25b735f05feef3a9ad1fb6e697d448af5146da6600000000000000002f6a2d434f52450142fdeae88682a965939fee9b7b2bd5b99694ff644e3ecda72cb7961caa4b541b1e322bcfe0b5a03000000000000000002b6a2952534b424c4f434b3a05ffec80772cb05eb6ffbe3558185800635415e4aac8225ca7dad9080068928b00000000",
//     );

//     let merkle_branch = [
//         hex_to_hash_rev("fa89c32152bf324cd1d47d48187f977c7e0f380f6f78132c187ce27923f62fcc"),
//         hex_to_hash_rev("c15911a240d89d1c8a573076e196430ceda007876ca90c519e4a7f6ff79739e0"),
//         hex_to_hash_rev("2d8485381c1c75e7cc1c52b069624a8af7fd0e5e981b2d9ea61ed38e774a9f20"),
//         hex_to_hash_rev("8fb144635252fd1be34ef99355fdd2fa2c78e625faf746f66ad10af5a21b7a5c"),
//         hex_to_hash_rev("849bff3bc184ae0df0b3d3bb560a68186cb711eb3a83dbfa890a4e6cc2487a47"),
//         hex_to_hash_rev("c3e238ef8453b701b200ad05c5fbf88e2928589be3a3808687e1e2dd3d540170"),
//         hex_to_hash_rev("82efe04d29ce3f27e71df0d496b24ec420b193d38e6e2c6b9dc126c08aad31cf"),
//         hex_to_hash_rev("749d481a6c62fb88d3cf7a768cc50bbc02e8968d5e1151222ee939c87b4ade7c"),
//         hex_to_hash_rev("f22343dd5c840c82a12afb0f0961dfebd73f568783cdfb5d9bd7531095922b04"),
//         hex_to_hash_rev("3a23346a49a08e95cca72b16f93bb92aa115e66343b8ca58deba4fe02f52c397"),
//         hex_to_hash_rev("c05714916a7088e105377682944fc1d04c295c378b560f2a643a2a584a706b98"),
//         hex_to_hash_rev("0e962a3c3aa944fa042e035851b2aa3c2c4a5173344684e7c2291ead8940a2b7"),
//     ]
//         .span();
//     let height_proof = Option::Some(
//         HeightProof { header: block_868239, coinbase_raw_tx, merkle_branch },
//     );

//     utu.register_blocks(array![block_868239].span());
//     utu.update_canonical_chain(868239, 868239, block_868239.hash(), height_proof);

//     let block_header = block_868239;
//     let inclusion_proof = siblings;
//     let tx_hash = "fa89c32152bf324cd1d47d48187f977c7e0f380f6f78132c187ce27923f62fcc";

//     start_cheat_block_timestamp(tx_inclusion, 1_730_373_503 + 3600); // submit after one hour
//     orderbook_dispatcher.submit_inscription(id, tx_hash, tx, 868239, block_header,
//     inclusion_proof);
// }



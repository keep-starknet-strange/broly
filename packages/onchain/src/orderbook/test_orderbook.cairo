use starknet::{ContractAddress};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address_global,
    stop_cheat_caller_address_global, test_address, start_cheat_block_number_global,
    stop_cheat_block_number_global,
};
use openzeppelin::presets::interfaces::{
    ERC20UpgradeableABIDispatcher, ERC20UpgradeableABIDispatcherTrait,
};
use openzeppelin::utils::serde::SerializedAppend;
use onchain::orderbook::interface::{OrderbookABIDispatcher, OrderbookABIDispatcherTrait};
use onchain::utils::{constants, erc20_utils};


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

fn setup_relay() -> ContractAddress {
    // declare TransactionInclusion contract
    let contract_class = declare("TransactionInclusion").unwrap().contract_class();

    // deploy TransactionInclusion contract
    let mut calldata = array![];
    calldata.append_serde(constants::UTU()); // TODO replace with deployed Utu contract

    let (relay_address, _) = contract_class.deploy(@calldata).unwrap();

    relay_address
}

fn setup() -> (OrderbookABIDispatcher, ERC20UpgradeableABIDispatcher) {
    // deploy an ERC20
    let (erc20_strk, _) = erc20_utils::setup_erc20(test_address());

    // deploy relay contract
    let relay_address = setup_relay();

    // deploy Orderbook contract
    let orderbook = setup_orderbook(erc20_strk.contract_address, relay_address);

    (orderbook, erc20_strk)
}

#[test]
fn test_request_inscription_stored_and_retrieved() {
    let (orderbook_dispatcher, token_dispatcher) = setup();

    let test_taproot_address: ByteArray =
        "bc1p5d7rjq7g6r4jdyhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    orderbook_dispatcher.request_inscription(test_data, test_taproot_address, 1, 'STRK'.into(), 10);

    let expected = ("data", 10); // the inscription data and the submitter fee
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
    let (orderbook_dispatcher, token_dispatcher) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    orderbook_dispatcher.request_inscription(test_data, test_taproot_address, 1, 'BTC'.into(), 10);
}

#[test]
#[should_panic]
fn test_request_inscription_fails_insufficient_balance() {
    let (orderbook_dispatcher, token_dispatcher) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 2000);

    orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 1, 'STRK'.into(), 2000);
}

#[test]
fn test_lock_inscription_works() {
    let (orderbook_dispatcher, token_dispatcher) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 1, 'STRK'.into(), 10);

    start_cheat_block_number_global(1000);
    orderbook_dispatcher.lock_inscription(id, "hash");
    stop_cheat_block_number_global();
}

#[test]
#[should_panic]
fn test_lock_inscription_fails_prior_lock_not_expired() {
    let (orderbook_dispatcher, token_dispatcher) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 1, 'STRK'.into(), 10);

    orderbook_dispatcher.lock_inscription(id, "hash");
    orderbook_dispatcher.lock_inscription(id, "other_hash");
}

#[test]
#[should_panic]
fn test_lock_inscription_fails_inscription_not_found() {
    let (orderbook_dispatcher, token_dispatcher) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let _ = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 1, 'STRK'.into(), 10);

    orderbook_dispatcher.lock_inscription(42, "hash");
}

#[test]
fn test_lock_inscription_fails_status_closed() { // TODO: when `submit_inscription` is implemented
}

#[test]
fn test_cancel_inscription_works() {
    let (orderbook_dispatcher, token_dispatcher) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 1, 'STRK'.into(), 10);

    start_cheat_caller_address_global(orderbook_dispatcher.contract_address);
    // TODO: is this the correct way to set permissions?
    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);
    stop_cheat_caller_address_global();

    orderbook_dispatcher.cancel_inscription(id, 'STRK'.into());
}

#[test]
#[should_panic]
fn test_cancel_inscription_fails_locked() {
    let (orderbook_dispatcher, token_dispatcher) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 1, 'STRK'.into(), 10);

    orderbook_dispatcher.lock_inscription(id, "hash");
    orderbook_dispatcher.cancel_inscription(id, 'STRK'.into())
}

#[test]
fn test_cancel_inscription_fails_closed() { // TODO: when `submit_inscription` is implemented
}

#[test]
#[should_panic]
fn test_cancel_inscription_fails_canceled() {
    let (orderbook_dispatcher, token_dispatcher) = setup();

    let test_taproot_address: ByteArray = "test";
    let test_data: ByteArray = "data";

    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);

    let id = orderbook_dispatcher
        .request_inscription(test_data, test_taproot_address, 1, 'STRK'.into(), 10);

    start_cheat_caller_address_global(orderbook_dispatcher.contract_address);
    token_dispatcher.approve(orderbook_dispatcher.contract_address, 100);
    stop_cheat_caller_address_global();

    orderbook_dispatcher.cancel_inscription(id, 'STRK'.into());
    orderbook_dispatcher.cancel_inscription(id, 'STRK'.into());
}

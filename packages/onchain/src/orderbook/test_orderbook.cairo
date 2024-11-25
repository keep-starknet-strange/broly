use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_timestamp};
use onchain::orderbook::orderbook::IOrderbookDispatcher;
use onchain::orderbook::orderbook::IOrderbookDispatcherTrait;

#[test]
fn test_request_inscription_stored_and_retrieved() {
    let contract_class = declare("Orderbook").unwrap().contract_class();

    let mut constructor_calldata = Default::default();

    let (address, _) = contract_class.deploy(@constructor_calldata).unwrap();
    let orderbook_dispatcher = IOrderbookDispatcher { contract_address: address };

    orderbook_dispatcher.request_inscription("0x1234", 1, 'ETH'.into(), 10);
    let expected = ("0x1234", 10);
    let actual = orderbook_dispatcher.query_inscription(0);
    assert_eq!(expected, actual);
}

#[test]
#[should_panic]
fn test_request_inscription_fails_wrong_currency() {
    let contract_class = declare("Orderbook").unwrap().contract_class();

    let mut constructor_calldata = Default::default();

    let (address, _) = contract_class.deploy(@constructor_calldata).unwrap();
    let orderbook_dispatcher = IOrderbookDispatcher { contract_address: address };

    orderbook_dispatcher.request_inscription("0x1234", 1, 'BTC'.into(), 10);
}
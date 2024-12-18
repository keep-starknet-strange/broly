use core::starknet::contract_address::ContractAddress;

#[derive(Default, Drop, PartialEq, starknet::Store)]
pub enum Status {
    Open,
    Locked,
    Canceled,
    Closed,
    #[default]
    Undefined,
}

#[starknet::interface]
pub trait IOrderbook<TContractState> {
    fn request_inscription(
        ref self: TContractState,
        inscription_data: ByteArray,
        receiving_address: ByteArray,
        currency_fee: felt252,
        submitter_fee: u256,
    ) -> u32;
    fn cancel_inscription(ref self: TContractState, inscription_id: u32, currency_fee: felt252);
    fn lock_inscription(ref self: TContractState, inscription_id: u32, tx_hash: ByteArray);
    fn submit_inscription(ref self: TContractState, inscription_id: u32, tx_hash: ByteArray);
    fn query_inscription(
        self: @TContractState, inscription_id: u32,
    ) -> (ContractAddress, ByteArray, u256);
}

#[starknet::interface]
pub trait OrderbookABI<TContractState> {
    fn request_inscription(
        ref self: TContractState,
        inscription_data: ByteArray,
        receiving_address: ByteArray,
        currency_fee: felt252,
        submitter_fee: u256,
    ) -> u32;
    fn cancel_inscription(ref self: TContractState, inscription_id: u32, currency_fee: felt252);
    fn lock_inscription(ref self: TContractState, inscription_id: u32, tx_hash: ByteArray);
    fn submit_inscription(ref self: TContractState, inscription_id: u32, tx_hash: ByteArray);
    fn query_inscription(
        self: @TContractState, inscription_id: u32,
    ) -> (ContractAddress, ByteArray, u256);

    // ERC20 functions
    fn balance_of(self: @TContractState, account: ContractAddress) -> felt252;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: felt252);
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: felt252,
    );
    fn approve(ref self: TContractState, spender: ContractAddress, amount: felt252);
    fn increase_allowance(ref self: TContractState, spender: ContractAddress, added_value: felt252);
    fn decrease_allowance(
        ref self: TContractState, spender: ContractAddress, subtracted_value: felt252,
    );
}

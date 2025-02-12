use core::starknet::contract_address::ContractAddress;
use consensus::{types::transaction::{Transaction}};
use utils::hash::Digest;
use utu_relay::bitcoin::block::BlockHeader;

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
    fn lock_inscription(ref self: TContractState, inscription_id: u32);
    fn submit_inscription(
        ref self: TContractState,
        inscription_id: u32,
        tx_hash: ByteArray,
        tx: Transaction,
        pk_script: Array<u8>,
        block_height: u64,
        block_header: BlockHeader,
        inclusion_proof: Array<(Digest, bool)>,
    );
    fn query_inscription(
        self: @TContractState, inscription_id: u32,
    ) -> (ContractAddress, ByteArray, u256, ByteArray);
    fn query_inscription_lock(self: @TContractState, inscription_id: u32) -> (ContractAddress, u64);
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
    fn lock_inscription(ref self: TContractState, inscription_id: u32);
    fn submit_inscription(
        ref self: TContractState,
        inscription_id: u32,
        tx_hash: ByteArray,
        tx: Transaction,
        pk_script: Array<u8>,
        block_height: u64,
        block_header: BlockHeader,
        inclusion_proof: Array<(Digest, bool)>,
    );
    fn query_inscription(
        self: @TContractState, inscription_id: u32,
    ) -> (ContractAddress, ByteArray, u256, ByteArray);
    fn query_inscription_lock(self: @TContractState, inscription_id: u32) -> (ContractAddress, u64);

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

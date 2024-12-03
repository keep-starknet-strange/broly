use starknet::{ContractAddress, contract_address_const};

pub const SUPPLY: u256 = 1_000_000_000_000_000_000; // 1 ETH

pub fn NAME() -> ByteArray {
    "Ethereum"
}

pub fn SYMBOL() -> ByteArray {
    "ETH"
}

pub fn OWNER() -> ContractAddress {
    contract_address_const::<'owner'>()
}
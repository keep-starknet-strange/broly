use openzeppelin::presets::interfaces::{ERC20UpgradeableABIDispatcher};
use openzeppelin::utils::serde::SerializedAppend;
use snforge_std::{declare, DeclareResultTrait, ContractClassTrait};
use starknet::ContractAddress;
use super::constants;

pub fn setup_erc20(recipient: ContractAddress) -> (ERC20UpgradeableABIDispatcher, ContractAddress) {
    let mut calldata = array![];

    calldata.append_serde(constants::NAME());
    calldata.append_serde(constants::SYMBOL());
    calldata.append_serde(constants::SUPPLY);
    calldata.append_serde(recipient);
    calldata.append_serde(recipient);

    let contract = declare("ERC20Upgradeable").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@calldata).unwrap();

    (ERC20UpgradeableABIDispatcher { contract_address: contract_address }, contract_address)
}

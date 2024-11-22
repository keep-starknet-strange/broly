#[starknet::interface]
trait IBroly<TContractState> {
    fn greet(ref self: TContractState) -> felt252;
}

#[starknet::contract]
mod HelloStarknet {
    #[storage]
    struct Storage {}

    #[external(v0)]
    impl BrolyImpl of super::IBroly<ContractState> {
        fn greet(ref self: ContractState) -> felt252 {
            'Kakarotto'
        }
    }
}

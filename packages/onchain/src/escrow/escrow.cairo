#[starknet::interface]
trait IEscrow<TContractState> {
    fn greet(ref self: TContractState) -> felt252;
}

#[starknet::contract]
mod Escrow {
    #[storage]
    struct Storage {}

    #[external(v0)]
    impl EscrowImpl of super::IEscrow<ContractState> {
        fn greet(ref self: ContractState) -> felt252 {
            'Kakarotto'
        }
    }
}

#[starknet::interface]
pub trait IOrderbook<TContractState> {
    fn request_inscription(
        ref self: TContractState, 
        inscription_data: ByteArray, 
        satoshi: felt252, 
        currency_fee: felt252, 
        submitter_fee: felt252
    ) -> u16;
    fn cancel_inscription(ref self: TContractState, inscription_id: u16);
    fn lock_inscription(ref self: TContractState, inscription_id: u16);
    fn submit_inscription(ref self: TContractState, inscription_id: u16);
    fn query_inscription(self: @TContractState, inscription_id: u16) -> (ByteArray, felt252);
}

#[starknet::contract]
mod Orderbook {
    use core::byte_array::ByteArray;
    use starknet::storage::{ 
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePathEntry, 
        StoragePointerReadAccess, StoragePointerWriteAccess, 
    };
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        // ID of the next inscription.
        new_inscription_id: u16,
        // A map from the inscription ID to a tuple with the inscribed 
        // data and submitter fee.
        inscriptions: Map<u16, (ByteArray, felt252)>,
        // A map from the inscription ID to status. Possible values:
        // 'Open', 'Locked', 'Closed'.
        inscription_statuses: Map<u16, felt252>,
        // A map from the inscription ID to the potential submitters.
        submitters: Map<u16, Map<ContractAddress, ContractAddress>>,
    }

    #[abi(embed_v0)]
    impl OrderbookImpl of super::IOrderbook<ContractState> {
        /// Called by a user. 
        /// Inputs: 
        /// - `inscription_data: ByteArray`, the data to be inscribed on Bitcoin.
        /// - `satoshi: felt252`, the Sat where the user wants to inscribe data.
        /// - `currency_fee: felt252`, 'ETH' or 'STRK' tokens.
        /// - `submitter_fee: u16`, fee to be paid to the submitter for the inscription.
        /// Returns:
        /// - `id: felt252`, the ID of the created inscription.
        fn request_inscription(
            ref self: ContractState, 
            inscription_data: ByteArray,
            satoshi: felt252, 
            currency_fee: felt252, 
            submitter_fee: felt252
        ) -> u16 {
            assert(
                currency_fee == 'STRK'.into() || currency_fee == 'ETH'.into(), 
                'The currency is not supported'
            );
            let id = self.new_inscription_id.read();
            self.inscriptions.write(id, (inscription_data, submitter_fee));
            id
        }

        /// Inputs: 
        /// - `inscription_id: felt252`, the ID of the inscription.
        /// Returns:
        /// - `(ByteArray, felt252)`, the tuple with the inscribed data and the fee.
        fn query_inscription(self: @ContractState, inscription_id: u16) -> (ByteArray, felt252) {
            self.inscriptions.read(inscription_id)
        }

        /// Called by a user. 
        /// Inputs: 
        /// - `inscription_id: felt252`, the ID of the inscription the user wants to 
        /// cancel. 
        fn cancel_inscription(ref self: ContractState, inscription_id: u16) {}

        /// Called by a submitter. Multiple submitters are allowed to lock the 
        /// inscription simultaneously. The fee will be received only by the 
        /// submitter that will actually create the inscription on Bitcoin. 
        /// Inputs: 
        /// - `inscription_id: felt252`, the ID of the inscription being locked. 
        fn lock_inscription(ref self: ContractState, inscription_id: u16) {
            let submitter = get_caller_address();
            let mut submitters = self.submitters.entry(inscription_id);
            
            submitters.write(submitter, submitter);
        }

        /// Called by a submitter. The fee is transferred to the submitter if 
        /// the inscription on Bitcoin has been made. The status of the 
        /// inscription changes from 'Locked' to 'Closed'.
        /// Inputs: 
        /// - `inscription_id: felt252`, the ID of the inscription being locked.
        fn submit_inscription(ref self: ContractState, inscription_id: u16) {
            // TODO: how do we process the transaction hash? 
        }
    }
}

use core::starknet::contract_address::ContractAddress;
use onchain::orderbook::interface::IOrderbook;

#[starknet::contract]
mod Orderbook {
    use core::byte_array::ByteArray;
    use openzeppelin_token::erc20::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};
    use starknet::storage::{ 
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePathEntry, 
        StoragePointerReadAccess, StoragePointerWriteAccess, 
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_number};

    #[storage]
    struct Storage {
        // ID of the next inscription.
        new_inscription_id: u32,
        // A map from the inscription ID to a tuple with the inscribed 
        // data and submitter fee.
        inscriptions: Map<u32, (ByteArray, u256)>,
        // A map from the inscription ID to status. Possible values:
        // 'Open', 'Locked', 'Canceled', 'Closed'.
        inscription_statuses: Map<u32, felt252>,
        // A map from the inscription ID to the potential submitters.
        submitters: Map<u32, Map<ContractAddress, ContractAddress>>,
        // Locks on inscriptions. Maps the inscription ID to a tuple of
        // submitter address, precomputed transaction hash, and block number.
        inscription_locks: Map<u32, (ContractAddress, ByteArray, u64)>,
        // STRK fee token. 
        strk_token: ERC20ABIDispatcher,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, strk_token: ContractAddress
    ) {
        // initialize contract
        self.initializer(:strk_token);
    }

    #[abi(embed_v0)]
    impl OrderbookImpl of super::IOrderbook<ContractState> {
        /// Called by a user. 
        /// Inputs: 
        /// - `inscription_data: ByteArray`, the data to be inscribed on Bitcoin.
        /// - `receiving_address: ByteArray`, the taproot address that will own the inscription.
        /// - `satoshi: felt252`, the Sat where the user wants to inscribe data.
        /// - `currency_fee: felt252`, 'STRK' tokens.
        /// - `submitter_fee: u256`, fee to be paid to the submitter for the inscription.
        /// Returns:
        /// - `id: felt252`, the ID of the created inscription.
        fn request_inscription(
            ref self: ContractState, 
            inscription_data: ByteArray,
            receiving_address: ByteArray,
            satoshi: felt252, 
            currency_fee: felt252, 
            submitter_fee: u256,
        ) -> u32 {
            assert(
                self.is_valid_taproot_address(receiving_address) == true, 
                'Not a valid taproot address'
            );
            assert(
                currency_fee == 'STRK'.into(), 
                'The currency is not supported'
            );
            let caller = get_caller_address();
            let escrow_address = get_contract_address();
            if (currency_fee == 'STRK'.into()) {
                let strk_token = self.strk_token.read();
                // TODO: change the transfer to the escrow contract once it's implemented.
                strk_token.transfer_from(sender: caller, recipient: escrow_address, amount: submitter_fee);
            }
            let id = self.new_inscription_id.read();
            self.inscriptions.write(id, (inscription_data, submitter_fee));
            id
        }

        /// Helper function that checks the format of the taproot address.
        /// Inputs: 
        /// - `receiving_address: ByteArray`, the ID of the inscription.
        /// Returns:
        /// - `bool`
        fn is_valid_taproot_address(self: @ContractState, receiving_address: ByteArray) -> bool {
            // TODO: implement the check that the receiving address is a valid Bech32m format.
            true
        }

        /// Inputs: 
        /// - `inscription_id: felt252`, the ID of the inscription.
        /// Returns:
        /// - `(ByteArray, felt252)`, the tuple with the inscribed data and the fee.
        fn query_inscription(self: @ContractState, inscription_id: u32) -> (ByteArray, u256) {
            self.inscriptions.read(inscription_id)
        }

        /// Called by a user. 
        /// Inputs: 
        /// - `inscription_id: felt252`, the ID of the inscription the user wants to 
        /// cancel. 
        /// - `currency_fee: felt252`, the token that the user paid the submitter fee in.
        fn cancel_inscription(ref self: ContractState, inscription_id: u32, currency_fee: felt252) {
            let status = self.inscription_statuses.read(inscription_id);
            assert(
                status != 'Locked'.into(),
                'The inscription is locked'
            );
            let caller = get_caller_address();
            // TODO: change the address to the actual escrow contract once it's implemented.
            let escrow_address = get_contract_address();
            if (currency_fee == 'STRK'.into()) {
                let strk_token = self.strk_token.read();
                let (_, amount) = self.inscriptions.read(inscription_id);
                strk_token.transfer_from(sender: escrow_address, recipient: caller, amount: amount);
            }
            let (inscription_data, _) = self.inscriptions.read(inscription_id);
            self.inscriptions.write(inscription_id, (inscription_data, 0));
            self.inscription_statuses.write(inscription_id, 'Canceled'.into());
        }

        /// Called by a submitter. Multiple submitters are allowed to lock the 
        /// inscription simultaneously. The fee will be received only by the 
        /// submitter that will actually create the inscription on Bitcoin. 
        /// Assert that the inscription has not been closed yet. If there is a 
        /// prior lock on the inscription, X blocks have to pass before a new
        /// lock can be created.
        /// Inputs: 
        /// - `inscription_id: u32`, the ID of the inscription being locked. 
        /// - `tx_hash: ByteArray`, the precomputed bitcoin transaction hash that will be
        /// submitted onchain by the submitter. 
        fn lock_inscription(ref self: ContractState, inscription_id: u32, tx_hash: ByteArray) {
            let status = self.inscription_statuses.read(inscription_id);
            assert(
                status != 'Closed'.into(),
                'The inscription has been closed'
            );
            assert(
                status != 'Canceled'.into(),
                'The inscription is canceled'
            );

            if (status == 'Locked'.into()) {
                let (_, _, blocknumber) = self.inscription_locks.read(inscription_id);
                // TODO: replace block time delta
                assert(get_block_number() - blocknumber < 100, 'Prior lock has not expired'); 
            }

            let submitter = get_caller_address();
            let mut submitters = self.submitters.entry(inscription_id);
            submitters.write(submitter, submitter);

            self.inscription_statuses.write(inscription_id, 'Locked'.into());
        }

        /// Called by a submitter. The fee is transferred to the submitter if 
        /// the inscription on Bitcoin has been made. The submitted hash must 
        /// match the precomputed transaction hash in storage. If successful, 
        /// the status of the inscription changes from 'Locked' to 'Closed'.
        /// Inputs: 
        /// - `inscription_id: felt252`, the ID of the inscription being locked.
        /// - `tx_hash: ByteArray`, the hash of the transaction submitted to Bitcoin.
        fn submit_inscription(ref self: ContractState, inscription_id: u32, tx_hash: ByteArray) {
            let (_, precomputed_tx_hash, _) = self.inscription_locks.read(inscription_id);
            assert(precomputed_tx_hash == tx_hash, 'Precomputed hash != submitted');

            // TODO: process the submitted transaction hash, verify that it is on Bitcoin

            self.inscription_statuses.write(inscription_id, 'Closed'.into());
        }

        /// Helper function that checks if the inscription has already been locked.
        /// Inputs: 
        /// - `tx_hash: ByteArray`, the precomputed transaction hash for the inscription 
        /// being locked.
        /// Returns:
        /// - `(bool, ContractAddress)`
        fn is_locked(self: @ContractState, tx_hash: ByteArray) -> (bool, ContractAddress) {
            // TODO: fetch the relevant lock made with the precomputed tx hash

            let caller = get_caller_address();
            (true, caller)
        }
    }

    #[generate_trait]
    pub impl InternalImpl of InternalTrait {
        /// Executed once when the Orderbook contract is deployed. Used to set 
        /// initial values for contract storage variables for the fee tokens.
        fn initializer(ref self: ContractState, strk_token: ContractAddress) {
            self.strk_token.write(ERC20ABIDispatcher { contract_address: strk_token });
        }
    }
}

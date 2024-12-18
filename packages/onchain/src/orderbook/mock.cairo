use onchain::orderbook::interface::IOrderbook;

#[starknet::contract]
mod OrderbookMock {
    use core::byte_array::ByteArray;
    use onchain::orderbook::interface::Status;
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
        inscriptions: Map<u32, (ContractAddress, ByteArray, u256)>,
        // A map from the inscription ID to status. Possible values:
        // 'Open', 'Locked', 'Canceled', 'Closed'.
        inscription_statuses: Map<u32, Status>,
        // A map from the inscription ID to the potential submitters.
        submitters: Map<u32, Map<ContractAddress, ContractAddress>>,
        // Locks on inscriptions. Maps the inscription ID to a tuple of
        // submitter address, precomputed transaction hash, and block number.
        inscription_locks: Map<u32, (ContractAddress, ByteArray, u64)>,
        // STRK fee token.
        strk_token: ERC20ABIDispatcher,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        RequestCreated: RequestCreated,
        RequestCanceled: RequestCanceled,
        RequestLocked: RequestLocked,
        RequestCompleted: RequestCompleted,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestCreated {
        #[key]
        inscription_id: u32,
        #[key]
        caller: ContractAddress,
        inscription_data: ByteArray,
        receiving_address: ByteArray,
        currency_fee: felt252,
        submitter_fee: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestCanceled {
        #[key]
        inscription_id: u32,
        currency_fee: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestLocked {
        #[key]
        inscription_id: u32,
        tx_hash: ByteArray,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestCompleted {
        #[key]
        inscription_id: u32,
        tx_hash: ByteArray,
    }

    #[constructor]
    fn constructor(ref self: ContractState, strk_token: ContractAddress) {
        // initialize contract
        self.initializer(:strk_token);
    }

    #[abi(embed_v0)]
    impl OrderbookMockImpl of super::IOrderbook<ContractState> {
        /// Called by a user.
        /// Inputs:
        /// - `inscription_data: ByteArray`, the data to be inscribed on Bitcoin.
        /// - `receiving_address: ByteArray`, the taproot address that will own the inscription.
        /// - `currency_fee: felt252`, 'STRK' tokens.
        /// - `submitter_fee: u256`, fee to be paid to the submitter for the inscription.
        /// Returns:
        /// - `id: felt252`, the ID of the created inscription.
        fn request_inscription(
            ref self: ContractState,
            inscription_data: ByteArray,
            receiving_address: ByteArray,
            currency_fee: felt252,
            submitter_fee: u256,
        ) -> u32 {
            assert(currency_fee == 'STRK'.into(), 'The currency is not supported');
            let caller = get_caller_address();
            let id = self.new_inscription_id.read();
            self.inscriptions.write(id, (caller, inscription_data.clone(), submitter_fee));
            self.inscription_statuses.write(id, Status::Open);
            self.new_inscription_id.write(id + 1);
            self
                .emit(
                    RequestCreated {
                        inscription_id: id,
                        caller: get_caller_address(),
                        inscription_data: inscription_data,
                        receiving_address: receiving_address,
                        currency_fee: currency_fee,
                        submitter_fee: submitter_fee,
                    },
                );
            id
        }

        /// Called by a user.
        /// Inputs:
        /// - `inscription_id: felt252`, the ID of the inscription the user wants to
        /// cancel.
        /// - `currency_fee: felt252`, the token that the user paid the submitter fee in.
        fn cancel_inscription(ref self: ContractState, inscription_id: u32, currency_fee: felt252) {
            let caller = get_caller_address();
            let (request_creator, inscription_data, amount) = self
                .inscriptions
                .read(inscription_id);
            assert(caller == request_creator, 'Caller cannot cancel this id');

            let status = self.inscription_statuses.read(inscription_id);
            assert(status != Status::Undefined, 'Inscription does not exist');
            assert(status != Status::Locked, 'The inscription is locked');
            assert(status != Status::Canceled, 'The inscription is canceled');
            assert(status != Status::Closed, 'The inscription has been closed');

            // TODO: change the address to the actual escrow contract once it's implemented.
            let escrow_address = get_contract_address();
            if (currency_fee == 'STRK'.into()) {
                let strk_token = self.strk_token.read();
                strk_token.transfer_from(sender: escrow_address, recipient: caller, amount: amount);
            }
            self.inscriptions.write(inscription_id, (caller, inscription_data, 0));
            self.inscription_statuses.write(inscription_id, Status::Canceled);
            self
                .emit(
                    RequestCanceled { inscription_id: inscription_id, currency_fee: currency_fee },
                );
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
            let submitter = get_caller_address();
            let mut submitters = self.submitters.entry(inscription_id);
            submitters.write(submitter, submitter);

            self.inscription_statuses.write(inscription_id, Status::Locked);
            self.emit(RequestLocked { inscription_id: inscription_id, tx_hash: tx_hash });
        }

        /// Called by a submitter. The fee is transferred to the submitter if
        /// the inscription on Bitcoin has been made. The submitted hash must
        /// match the precomputed transaction hash in storage. If successful,
        /// the status of the inscription changes from 'Locked' to 'Closed'.
        /// Inputs:
        /// - `inscription_id: felt252`, the ID of the inscription being locked.
        /// - `tx_hash: ByteArray`, the hash of the transaction submitted to Bitcoin.
        fn submit_inscription(ref self: ContractState, inscription_id: u32, tx_hash: ByteArray) {
            // TODO: process the submitted transaction hash, verify that it is on Bitcoin

            self.inscription_statuses.write(inscription_id, Status::Closed);
            self.emit(RequestCompleted { inscription_id: inscription_id, tx_hash: tx_hash });
        }

        fn query_inscription(
            self: @ContractState, inscription_id: u32,
        ) -> (ContractAddress, ByteArray, u256) {
            return self.inscriptions.read(inscription_id);
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

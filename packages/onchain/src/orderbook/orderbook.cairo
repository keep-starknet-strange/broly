use onchain::orderbook::interface::IOrderbook;

#[starknet::contract]
mod Orderbook {
    use core::byte_array::ByteArray;
    use onchain::orderbook::interface::Status;
    use openzeppelin_token::erc20::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePathEntry,
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_number};
    use starknet::{SyscallResultTrait, syscalls::call_contract_syscall};

    #[storage]
    struct Storage {
        // ID of the next inscription.
        new_inscription_id: u32,
        // A map from the inscription ID to a tuple with the caller, the
        // inscribed data, and submitter fee.
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
        // Address of the contract checking transaction inclusion.
        relay_address: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, strk_token: ContractAddress, relay_address: ContractAddress,
    ) {
        // initialize contract
        self.initializer(:strk_token, :relay_address);
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
        pub id: u32,
        pub caller: ContractAddress,
        pub inscription_data: ByteArray,
        pub receiving_address: ByteArray,
        pub currency_fee: felt252,
        pub submitter_fee: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestCanceled {
        pub id: u32,
        pub currency_fee: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestLocked {
        pub id: u32,
        pub submitter: ContractAddress,
        pub tx_hash: ByteArray,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestCompleted {
        pub id: u32,
        pub submitter: ContractAddress,
        pub tx_hash: ByteArray,
    }

    #[abi(embed_v0)]
    impl OrderbookImpl of super::IOrderbook<ContractState> {
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
            let escrow_address = get_contract_address();
            if (currency_fee == 'STRK'.into()) {
                let strk_token = self.strk_token.read();
                // TODO: change the transfer to the escrow contract once it's implemented.
                strk_token
                    .transfer_from(
                        sender: caller, recipient: escrow_address, amount: submitter_fee,
                    );
            }
            let id = self.new_inscription_id.read();
            self.inscriptions.write(id, (caller, inscription_data.clone(), submitter_fee));
            self.inscription_statuses.write(id, Status::Open);
            self
                .emit(
                    RequestCreated {
                        id: id,
                        caller: caller,
                        inscription_data: inscription_data,
                        receiving_address: receiving_address,
                        currency_fee: currency_fee,
                        submitter_fee: submitter_fee,
                    },
                );
            id
        }

        /// Inputs:
        /// - `inscription_id: felt252`, the ID of the inscription.
        /// Returns:
        /// - `(ByteArray, felt252)`, the tuple with the inscribed data and the fee.
        fn query_inscription(
            self: @ContractState, inscription_id: u32,
        ) -> (ContractAddress, ByteArray, u256) {
            self.inscriptions.read(inscription_id)
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
            self.emit(RequestCanceled { id: inscription_id, currency_fee: currency_fee });
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
            assert(status != Status::Undefined, 'Inscription does not exist');
            assert(status != Status::Canceled, 'The inscription is canceled');
            assert(status != Status::Closed, 'The inscription has been closed');

            if (status == Status::Locked) {
                let (_, _, blocknumber) = self.inscription_locks.read(inscription_id);
                // TODO: replace block time delta
                assert(get_block_number() - blocknumber < 100, 'Prior lock has not expired');
            }

            let submitter = get_caller_address();
            let mut submitters = self.submitters.entry(inscription_id);
            submitters.write(submitter, submitter);

            self.inscription_statuses.write(inscription_id, Status::Locked);
            self.emit(RequestLocked { id: inscription_id, submitter: submitter, tx_hash: tx_hash });
        }

        /// Called by a submitter. The fee is transferred to the submitter if
        /// the inscription on Bitcoin has been made. The submitted hash must
        /// match the precomputed transaction hash in storage. If successful,
        /// the status of the inscription changes from 'Locked' to 'Closed'.
        /// Inputs:
        /// - `inscription_id: felt252`, the ID of the inscription being locked.
        /// - `tx_hash: ByteArray`, the hash of the transaction submitted to Bitcoin.
        fn submit_inscription(ref self: ContractState, inscription_id: u32, tx_hash: ByteArray) {
            let caller = get_caller_address();
            let submitters = self.submitters.entry(inscription_id);
            let submitter = submitters.read(caller);
            assert(caller == submitter, 'Caller does not match submitter');

            let (_, precomputed_tx_hash, _) = self.inscription_locks.read(inscription_id);
            assert(precomputed_tx_hash == tx_hash, 'Precomputed hash != submitted');

            const selector: felt252 = selector!("prove_inclusion");
            let to = self.relay_address.read();
            let calldata: Array<felt252> = array![];

            // TODO: assert successful inclusion call
            call_contract_syscall(to, selector, calldata.span()).unwrap_syscall();

            // TODO: assert that the witness data contains the requested inscription

            self.inscription_statuses.write(inscription_id, Status::Closed);
            self
                .emit(
                    RequestCompleted { id: inscription_id, submitter: submitter, tx_hash: tx_hash },
                );
        }
    }

    #[generate_trait]
    pub impl InternalImpl of InternalTrait {
        /// Executed once when the Orderbook contract is deployed. Used to set
        /// initial values for contract storage variables for the fee tokens.
        fn initializer(
            ref self: ContractState, strk_token: ContractAddress, relay_address: ContractAddress,
        ) {
            self.strk_token.write(ERC20ABIDispatcher { contract_address: strk_token });
            self.relay_address.write(relay_address);
        }
    }
}

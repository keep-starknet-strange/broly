use onchain::orderbook::interface::IOrderbook;

#[starknet::contract]
mod Orderbook {
    use core::byte_array::ByteArray;
    use core::array::{ToSpanTrait, SpanTrait};
    use consensus::{types::transaction::Transaction};
    use onchain::orderbook::interface::Status;
    use onchain::broly_utils::taproot_utils::{extract_p2tr_tweaked_pubkey, hex_to_hash_rev, to_hex};
    use openzeppelin::utils::serde::SerializedAppend;
    use openzeppelin_token::erc20::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePathEntry,
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_number};
    use starknet::{SyscallResultTrait, syscalls::call_contract_syscall};
    use utils::hash::Digest;
    use utu_relay::bitcoin::block::{BlockHeader, BlockHashImpl};
    use utu_relay::interfaces::HeightProof;

    #[storage]
    struct Storage {
        // ID of the next inscription.
        new_inscription_id: u32,
        // A map from the inscription ID to a tuple with the caller, the
        // inscribed data, submitter fee, and the expected address.
        inscriptions: Map<u32, (ContractAddress, ByteArray, u256, ByteArray)>,
        // A map from the inscription ID to status. Possible values:
        // 'Open', 'Locked', 'Canceled', 'Closed', 'Undefined'.
        inscription_statuses: Map<u32, Status>,
        // A map from the inscription ID to the potential submitters.
        submitters: Map<u32, Map<ContractAddress, ContractAddress>>,
        // Locks on inscriptions. Maps the inscription ID to a tuple of
        // submitter address, and block number.
        inscription_locks: Map<u32, (ContractAddress, u64)>,
        // STRK fee token.
        strk_token: ERC20ABIDispatcher,
        // Address of the contract checking transaction inclusion in the block.
        tx_inclusion: ContractAddress,
        // Address of the contract checking block inclusion in the Bitcoin blockchain.
        utu_relay: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        strk_token: ContractAddress,
        tx_inclusion: ContractAddress,
        utu_relay: ContractAddress,
    ) {
        // initialize contract
        self.initializer(:strk_token, :tx_inclusion, :utu_relay);
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
        pub inscription_id: u32,
        #[key]
        pub caller: ContractAddress,
        pub receiving_address: ByteArray,
        pub currency_fee: felt252,
        pub submitter_fee: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestCanceled {
        #[key]
        pub inscription_id: u32,
        pub currency_fee: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestLocked {
        #[key]
        pub inscription_id: u32,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RequestCompleted {
        #[key]
        pub inscription_id: u32,
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
                strk_token
                    .transfer_from(
                        sender: caller, recipient: escrow_address, amount: submitter_fee,
                    );
            }
            let id = self.new_inscription_id.read();
            self
                .inscriptions
                .write(
                    id,
                    (caller, inscription_data.clone(), submitter_fee, receiving_address.clone()),
                );
            self.inscription_statuses.write(id, Status::Open);
            self.new_inscription_id.write(id + 1);
            self
                .emit(
                    RequestCreated {
                        inscription_id: id,
                        caller: caller,
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
        /// - `(ContractAddress, ByteArray, felt252, ByteArray)`, the tuple with the requestor,
        /// inscribed data, the fee, and the receiving Bitcoin address.
        fn query_inscription(
            self: @ContractState, inscription_id: u32,
        ) -> (ContractAddress, ByteArray, u256, ByteArray) {
            self.inscriptions.read(inscription_id)
        }

        /// Inputs:
        /// - `inscription_id: felt252`, the ID of the inscription.
        /// Returns:
        /// - `(ContractAddress, felt252)`, the tuple with submitter address
        /// and the block number.
        fn query_inscription_lock(
            self: @ContractState, inscription_id: u32,
        ) -> (ContractAddress, u64) {
            self.inscription_locks.read(inscription_id)
        }

        /// Called by a user.
        /// Inputs:
        /// - `inscription_id: felt252`, the ID of the inscription the user wants to
        /// cancel.
        /// - `currency_fee: felt252`, the token that the user paid the submitter fee in.
        fn cancel_inscription(ref self: ContractState, inscription_id: u32, currency_fee: felt252) {
            let caller = get_caller_address();
            let (request_creator, inscription_data, amount, expected_address) = self
                .inscriptions
                .read(inscription_id);
            assert(caller == request_creator, 'Caller cannot cancel this id');

            let status = self.inscription_statuses.read(inscription_id);
            assert(status != Status::Undefined, 'Inscription does not exist');
            assert(status != Status::Locked, 'The inscription is locked');
            assert(status != Status::Canceled, 'The inscription is canceled');
            assert(status != Status::Closed, 'The inscription has been closed');

            let escrow_address = get_contract_address();
            if (currency_fee == 'STRK'.into()) {
                let strk_token = self.strk_token.read();
                strk_token.transfer(recipient: caller, amount: amount);
            }
            self
                .inscriptions
                .write(inscription_id, (caller, inscription_data, 0, expected_address));
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
        fn lock_inscription(ref self: ContractState, inscription_id: u32) {
            let status = self.inscription_statuses.read(inscription_id);
            assert(status != Status::Undefined, 'Inscription does not exist');
            assert(status != Status::Canceled, 'The inscription is canceled');
            assert(status != Status::Closed, 'The inscription has been closed');

            if (status == Status::Locked) {
                let (_, blocknumber) = self.inscription_locks.read(inscription_id);
                // TODO: replace hardcoded block time delta
                assert(get_block_number() - blocknumber > 100, 'Prior lock has not expired');
            }

            let submitter = get_caller_address();
            let mut submitters = self.submitters.entry(inscription_id);
            submitters.write(submitter, submitter);

            self.inscription_statuses.write(inscription_id, Status::Locked);
            self.inscription_locks.write(inscription_id, (submitter, get_block_number()));
            self.emit(RequestLocked { inscription_id: inscription_id });
        }

        /// Called by a submitter. The fee is transferred to the submitter if
        /// the inscription on Bitcoin has been made. If successful,the status
        /// of the inscription changes from 'Locked' to 'Closed'.
        /// Inputs:
        /// - `inscription_id: felt252`, the ID of the inscription being locked.
        /// - `currency_fee: felt252`, the token that the user paid the submitter fee in.
        /// - `tx_hash: ByteArray`, the hash of the creation transaction on Bitcoin.
        /// - `prev_tx_hash: ByteArray`, the hash of the transfer transaction on Bitcoin.
        /// - `tx: Transaction`, the `Transaction` structure with the creation details.
        /// - `prev_tx: Transaction`, the `Transaction` structure with the transfer details.
        /// - `pk_script: Array<u8>`, the unlocking script in the output referencing the
        /// inscription.
        /// - `block_height: u64`, the number of the block that contains the transfer tx.
        /// - `prev_block_height: u64`, the number of the block that contains the creation tx.
        /// - `block_header: BlockHeader`, the header of the block that contains the transfer tx.
        /// - `prev_block_header: BlockHeader`, the header of the block that contains the creation
        /// tx.
        /// - `inclusion_proof: Array<(Digest, bool)>`, the inclusion leaves for the transfer tx.
        /// - `prev_inclusion_proof: Array<(Digest, bool)>`, the inclusion leaves for the creation
        /// tx.
        fn submit_inscription(
            ref self: ContractState,
            inscription_id: u32,
            currency_fee: felt252,
            tx_hash: ByteArray,
            prev_tx_hash: ByteArray,
            tx: Transaction,
            prev_tx: Transaction,
            pk_script: Array<u8>,
            block_height: u64,
            prev_block_height: u64,
            block_header: BlockHeader,
            prev_block_header: BlockHeader,
            height_proof: Option<HeightProof>,
            prev_height_proof: Option<HeightProof>,
            inclusion_proof: Array<(Digest, bool)>,
            prev_inclusion_proof: Array<(Digest, bool)>,
        ) {
            let caller = get_caller_address();
            let submitters = self.submitters.entry(inscription_id);
            let submitter = submitters.read(caller);
            assert(caller == submitter, 'Caller does not match submitter');

            let (_, expected_data, amount, expected_address) = self
                .query_inscription(inscription_id);

            // Check that the tweaked public key contains the script that allows the receiver to
            // unlock and send the inscription in the future.
            assert(
                extract_p2tr_tweaked_pubkey(pk_script) == expected_address,
                'Unexpected address in pk_script',
            );

            // Check that the transfer transaction input points to the previous transaction id.
            let previous_tx_hash_from_output: Digest = *tx.inputs[0].previous_output.txid;
            assert(
                previous_tx_hash_from_output == hex_to_hash_rev(prev_tx_hash),
                'Unexpected previous tx id.',
            );

            // Check that the transfer transaction has 2 inputs and 2 outputs.
            assert(tx.inputs.len() == 2, 'Wrong number of tx inputs');
            assert(tx.outputs.len() == 2, 'Wrong number of tx outputs');

            // Check that the creation transaction has 1 input and 1 output.
            assert(prev_tx.inputs.len() == 1, 'Wrong number of prev tx inputs');
            assert(prev_tx.outputs.len() == 1, 'Wrong number of prev tx outputs');

            // Check that the transfer of the UTXO containing the inscriptions has the minimum dust
            // value.
            assert(
                *tx.inputs[0].previous_output.data.value == 546_u64, 'Unexpected value in input',
            );

            // Check that the full amount of the dust satoshis have been transferred to the expected
            // address.
            assert(*tx.outputs[0].value == 546_u64, 'Unexpected value in output');

            // Check that the length of the witness stack equals to 3 elements.
            let deref_witness = *prev_tx.inputs[0].witness;
            assert(deref_witness.len() == 3, 'Wrong # of witness elements');

            // Check that the second field of the witness stack in the linked UTXO contains the
            // correct inscription.
            let witness_data = deref_witness[1];

            let mut dest: ByteArray = Default::default();
            // TODO: add the extra bytes on the frontend instead if possible to sign with Xverse.
            for i in 35..witness_data.len() {
                dest.append_byte(witness_data[i]);
            };
            let witness_data_hex = to_hex(@dest);
            assert(witness_data_hex == expected_data, 'The inscribed data is wrong');

            const selector: felt252 = selector!("prove_inclusion");
            let to = self.tx_inclusion.read();

            // Check the inclusion of the transfer transaction
            let mut calldata = array![];
            calldata.append_serde(tx);
            calldata.append_serde(block_height);
            calldata.append_serde(block_header);
            calldata.append_serde(inclusion_proof);

            call_contract_syscall(to, selector, calldata.span()).unwrap_syscall();

            // Check the inclusion of the creation transaction
            let mut calldata = array![];
            calldata.append_serde(prev_tx);
            calldata.append_serde(prev_block_height);
            calldata.append_serde(prev_block_header);
            calldata.append_serde(prev_inclusion_proof);

            call_contract_syscall(to, selector, calldata.span()).unwrap_syscall();

            // Send the reward amount to the submitter
            if (currency_fee == 'STRK'.into()) {
                let strk_token = self.strk_token.read();
                strk_token.transfer(recipient: caller, amount: amount);
            }

            self.inscription_statuses.write(inscription_id, Status::Closed);
            self.emit(RequestCompleted { inscription_id: inscription_id, tx_hash: tx_hash });
        }
    }

    #[generate_trait]
    pub impl InternalImpl of InternalTrait {
        /// Executed once when the Orderbook contract is deployed. Used to set
        /// initial values for contract storage variables for the fee tokens.
        fn initializer(
            ref self: ContractState,
            strk_token: ContractAddress,
            tx_inclusion: ContractAddress,
            utu_relay: ContractAddress,
        ) {
            self.strk_token.write(ERC20ABIDispatcher { contract_address: strk_token });
            self.tx_inclusion.write(tx_inclusion);
            self.utu_relay.write(utu_relay);
        }
    }
}

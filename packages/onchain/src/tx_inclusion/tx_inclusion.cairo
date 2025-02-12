use consensus::{types::transaction::{Transaction}};
use utils::hash::Digest;
use utu_relay::bitcoin::block::BlockHeader;

#[starknet::interface]
pub trait ITransactionInclusion<TContractState> {
    fn prove_inclusion(
        ref self: TContractState,
        tx: Transaction,
        block_height: u64,
        block_header: BlockHeader,
        inclusion_proof: Array<(Digest, bool)>,
    );
}

#[starknet::contract]
mod TransactionInclusion {
    use consensus::{codec::Encode, types::transaction::Transaction};
    use onchain::utils::taproot_utils::compute_merkle_root;
    use utu_relay::bitcoin::block::BlockHashTrait;
    use starknet::{ContractAddress, get_block_timestamp};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use utils::{hash::Digest, double_sha256::double_sha256_byte_array, numeric::u32_byte_reverse};
    use utu_relay::{
        interfaces::{IUtuRelayDispatcher, IUtuRelayDispatcherTrait}, bitcoin::block::BlockHeader,
    };

    #[storage]
    struct Storage {
        utu_address: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, utu_address: ContractAddress) {
        self.utu_address.write(utu_address);
    }

    #[abi(embed_v0)]
    impl TransactionInclusionImpl of super::ITransactionInclusion<ContractState> {
        fn prove_inclusion(
            ref self: ContractState,
            tx: Transaction,
            block_height: u64,
            block_header: BlockHeader,
            inclusion_proof: Array<(Digest, bool)>,
        ) {
            let tx_bytes_legacy = @tx.encode();
            let tx_id = double_sha256_byte_array(tx_bytes_legacy);

            // we verify this tx is included in the provided block
            let merkle_root = compute_merkle_root(tx_id, inclusion_proof);
            assert(
                block_header.merkle_root_hash.value == merkle_root.value,
                'Invalid inclusion proof.',
            );

            // we verify this block is safe to use (part of the canonical chain & sufficient pow)
            // sufficient pow for our usecase: 100 sextillion expected hashes
            let utu = IUtuRelayDispatcher { contract_address: self.utu_address.read() };
            utu.assert_safe(block_height, block_header.hash(), 100_000_000_000_000_000_000_000, 0);
            // we ensure this block was not premined
            let block_time = u32_byte_reverse(block_header.time).into();
            assert(block_time <= get_block_timestamp(), 'Block comes from the future.');
        }
    }
}

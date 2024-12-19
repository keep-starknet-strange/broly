use utils::hash::Digest;
use utils::double_sha256::double_sha256_parent;

/// Computes the Merkle root from a transaction hash and its siblings.
///
/// Arguments:
/// - `tx_hash: Digest`: The transaction hash as a Digest
/// - `siblings: Array<(Digest, bool)>`: An array of tuples (Digest, bool), where the bool indicates
/// if the sibling is on the right
///
/// Returns:
/// - `Digest`: The computed Merkle root as a Digest
pub fn compute_merkle_root(tx_hash: Digest, siblings: Array<(Digest, bool)>) -> Digest {
    let mut current_hash = tx_hash;

    // Iterate through all siblings
    let mut i = 0;
    loop {
        if i == siblings.len() {
            break;
        }

        let (sibling, is_left) = *siblings.at(i);

        // Concatenate current_hash and sibling based on the order
        current_hash =
            if is_left {
                double_sha256_parent(@sibling, @current_hash)
            } else {
                double_sha256_parent(@current_hash, @sibling)
            };

        i += 1;
    };

    current_hash
}

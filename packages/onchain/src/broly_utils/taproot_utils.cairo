use utils::hash::Digest;
use utils::double_sha256::double_sha256_parent;
use onchain::broly_utils::bech32m::encode;

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

/// Arguments:
/// - `script: Array<u8>`: the tweaked public key contained in the `pk_script` field of `TxOut`.
/// Returns:
/// - `ByteArray`: the bech32m encoded Taproot compatible Bitcoin address.
pub fn extract_p2tr_tweaked_pubkey(script: Array<u8>) -> ByteArray {
    assert(*script[0] == 0x51, 'expected OP_1 prefix');
    assert(*script[1] == 0x20, 'expected OP_PUSHBYTES_32 prefix');
    let script_length = script.len();
    assert(script_length == 34, 'expected length 34');

    let mut tweaked_pubkey: ByteArray = Default::default();
    tweaked_pubkey.append_byte(0x01);
    let mut i = 2;
    let stop = i + 32;
    loop {
        if i == stop {
            break;
        }
        tweaked_pubkey.append_byte(*script[i]);
        i += 1;
    };

    let hrp = "bc";
    return encode(@hrp, @tweaked_pubkey, 90);
}

// TODO: remove the functions below, import failed, but they are from 
// https://github.com/keep-starknet-strange/raito/blob/main/packages/utils/src/hex.cairo
// Gets `Digest` from reversed `ByteArray`.
pub fn hex_to_hash_rev(hex_string: ByteArray) -> Digest {
    let mut result: Array<u32> = array![];
    let mut i = 0;
    let mut unit: u32 = 0;
    let len = hex_string.len();
    while i != len {
        if (i != 0 && i % 8 == 0) {
            result.append(unit);
            unit = 0;
        }
        let hi = hex_char_to_nibble(hex_string[len - i - 2]);
        let lo = hex_char_to_nibble(hex_string[len - i - 1]);
        unit = (unit * 256) + (hi * 16 + lo).into();
        i += 2;
    };
    result.append(unit);

    Digest {
        value: [
            *result[0], *result[1], *result[2], *result[3], *result[4], *result[5], *result[6],
            *result[7],
        ],
    }
}

/// Converts bytes to hex (base16).
pub fn to_hex(data: @ByteArray) -> ByteArray {
    let alphabet: @ByteArray = @"0123456789abcdef";
    let mut result: ByteArray = Default::default();

    let mut i = 0;
    while i != data.len() {
        let value: u32 = data[i].into();
        let (l, r) = core::traits::DivRem::div_rem(value, 16);
        result.append_byte(alphabet.at(l).unwrap());
        result.append_byte(alphabet.at(r).unwrap());
        i += 1;
    };

    result
}

pub fn hex_char_to_nibble(hex_char: u8) -> u8 {
    if hex_char >= 48 && hex_char <= 57 {
        // 0-9
        hex_char - 48
    } else if hex_char >= 65 && hex_char <= 70 {
        // A-F
        hex_char - 55
    } else if hex_char >= 97 && hex_char <= 102 {
        // a-f
        hex_char - 87
    } else {
        panic!("Invalid hex character: {hex_char}");
        0
    }
}
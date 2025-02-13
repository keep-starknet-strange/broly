use core::array::ArrayTrait;
use core::byte_array::ByteArrayTrait;
use core::cmp::min;
use core::array::ToSpanTrait;
use core::option::OptionTrait;
use core::traits::{Into, TryInto};
use alexandria_math::BitShift;

//! bech32m encoding implementation
//! Spec: https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki#bech32m

fn polymod(values: Array<u8>) -> u32 {
    let generator = array![
        0x3b6a57b2_u32, 0x26508e6d_u32, 0x1ea119fa_u32, 0x3d4233dd_u32, 0x2a1462b3_u32,
    ];
    let generator = generator.span();

    let mut chk = 1_u32;

    let len = values.len();
    let mut p: usize = 0;
    while p != len {
        let top = BitShift::shr(chk, 25);
        chk = BitShift::shl((chk & 0x1ffffff_u32), 5) ^ (*values.at(p)).into();
        let mut i = 0_usize;
        while i != 5 {
            if BitShift::shr(top, i) & 1_u32 != 0 {
                chk = chk ^ *generator.at(i.into());
            }
            i += 1;
        };
        p += 1;
    };

    chk
}

fn hrp_expand(hrp: @Array<u8>) -> Array<u8> {
    let mut r: Array<u8> = ArrayTrait::new();

    let len = hrp.len();
    let mut i = 0;
    while i != len {
        r.append(BitShift::shr(*hrp.at(i), 5));
        i += 1;
    };
    r.append(0);

    let len = hrp.len();
    let mut i = 0;
    while i != len {
        r.append(*hrp.at(i) & 31);
        i += 1;
    };

    r
}

fn convert_bytes_to_5bit_chunks(bytes: @Array<u8>) -> Array<u8> {
    let mut r = ArrayTrait::new();
    r.append(*bytes.at(0)); // handle the first byte separately for Taproot

    let len = bytes.len();
    let mut i = 1;

    let mut acc = 0_u8;
    let mut missing_bits = 5_u8;

    while i != len {
        let mut byte: u8 = *bytes.at(i);
        let mut bits_left = 8_u8;
        loop {
            let chunk_size = min(missing_bits, bits_left);
            let chunk = BitShift::shr(byte, 8 - chunk_size);
            r.append(acc + chunk);
            byte = BitShift::shl(byte, chunk_size);
            bits_left -= chunk_size;
            if bits_left < 5 {
                acc = BitShift::shr(byte, 3);
                missing_bits = 5 - bits_left;
                break ();
            } else {
                acc = 0;
                missing_bits = 5
            }
        };
        i += 1;
    };
    if missing_bits < 5 {
        r.append(acc);
    }
    r
}

impl ByteArrayTraitIntoArray of Into<@ByteArray, Array<u8>> {
    fn into(self: @ByteArray) -> Array<u8> {
        let mut r = ArrayTrait::new();
        let len = self.len();
        let mut i = 0;
        while i != len {
            r.append(self.at(i).unwrap());
            i += 1;
        };
        r
    }
}

fn checksum(hrp: @ByteArray, data: @Array<u8>) -> Array<u8> {
    let mut values = ArrayTrait::new();

    values.append_span(hrp_expand(@hrp.into()).span());
    values.append_span(data.span());
    let the_data: Array<u8> = array![0, 0, 0, 0, 0, 0];
    values.append_span(the_data.span());

    let m = polymod(values) ^ 0x2bc830a3; // XOR with 0x2bc830a3 if bech32m

    let mut r = ArrayTrait::new();
    r.append((BitShift::shr(m, 25) & 31).try_into().unwrap());
    r.append((BitShift::shr(m, 20) & 31).try_into().unwrap());
    r.append((BitShift::shr(m, 15) & 31).try_into().unwrap());
    r.append((BitShift::shr(m, 10) & 31).try_into().unwrap());
    r.append((BitShift::shr(m, 5) & 31).try_into().unwrap());
    r.append((m & 31).try_into().unwrap());

    r
}

pub fn encode(hrp: @ByteArray, data: @ByteArray, limit: usize) -> ByteArray {
    let alphabet: ByteArray = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

    let data_5bits = convert_bytes_to_5bit_chunks(@data.into());

    let cs = checksum(hrp, @data_5bits);

    let mut combined = ArrayTrait::new();
    combined.append_span(data_5bits.span());
    combined.append_span(cs.span());

    let mut encoded: ByteArray = Default::default();
    let mut i = 0;
    let len = combined.len();
    while i != len {
        encoded.append_byte(alphabet.at((*combined.at(i)).into()).unwrap());
        i += 1;
    };

    format!("{hrp}1{encoded}")
}

#[cfg(test)]
mod tests {
    // test data generated with: https://slowli.github.io/bech32-buffer/
    use super::encode;

    #[test]
    fn test_bech32m() {
        let mut hex: ByteArray = "";
        let data = array![
            0x01,
            0xd5,
            0xfd,
            0x01,
            0xe3,
            0x35,
            0xe8,
            0xc8,
            0xe0,
            0x42,
            0x07,
            0xef,
            0x53,
            0xc8,
            0xde,
            0xba,
            0x16,
            0xdd,
            0x8e,
            0x20,
            0xc4,
            0x79,
            0x3c,
            0xe0,
            0xb2,
            0x21,
            0x84,
            0xde,
            0x56,
            0x1d,
            0x44,
            0x47,
            0x82,
        ];
        for i in data {
            hex.append_byte(i);
        };

        assert_eq!(
            encode(@"bc", @hex, 90),
            "bc1p6h7srce4arywqss8aafu3h46zmwcugxy0y7wpv3psn09v82yg7pqn9sc28",
        );
    }
}

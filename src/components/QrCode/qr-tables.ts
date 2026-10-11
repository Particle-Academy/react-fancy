/**
 * ISO/IEC 18004 table data for the QR encoder. **Data, not logic** — kept in
 * its own module so the algorithm beside it can be read without scrolling past
 * 160 rows, and so a correction here is a diff that cannot touch behaviour.
 *
 * There is no formula for these: the block structure per version and error
 * correction level is a table in the standard. They were taken from the
 * published error-correction table at
 * <https://www.thonky.com/qr-code-tutorial/error-correction-table> rather than
 * recalled, and every row is checked by `qr-code.test.tsx` against three
 * equations that must all hold simultaneously:
 *
 *   1. `dataCodewords === g1Blocks * g1Size + g2Blocks * g2Size`
 *   2. `totalCodewords === dataCodewords + ecPerBlock * (g1Blocks + g2Blocks)`
 *   3. `totalCodewords === rawDataModules(version) / 8`, where
 *      `rawDataModules` is counted from the matrix THIS code builds.
 *
 * The third is the one worth having: it ties a transcribed table to an
 * independently constructed matrix, so a mistyped row, a wrong alignment
 * pattern position and a wrong function-pattern layout cannot all agree.
 */

/** Error correction level. Higher levels survive more damage and hold less. */
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export const EC_LEVELS: readonly QrErrorCorrection[] = ['L', 'M', 'Q', 'H'];

/** The 2-bit indicator each level carries in the format information. */
export const EC_FORMAT_BITS: Record<QrErrorCorrection, number> = {
  L: 0b01,
  M: 0b00,
  Q: 0b11,
  H: 0b10,
};

export interface BlockLayout {
  /** Data codewords in the whole symbol. */
  dataCodewords: number;
  /** Error correction codewords per block — the same for every block. */
  ecPerBlock: number;
  /** Blocks in group 1, and how many data codewords each holds. */
  g1Blocks: number;
  g1Size: number;
  /** Blocks in group 2 (always `g1Size + 1` each when present). */
  g2Blocks: number;
  g2Size: number;
}

/**
 * `[dataCodewords, ecPerBlock, g1Blocks, g1Size, g2Blocks, g2Size]` indexed by
 * `[version - 1]` then by EC level, in `L, M, Q, H` order.
 */
const BLOCK_TABLE: readonly (readonly [number, number, number, number, number, number])[][] = [
  // v1
  [[19, 7, 1, 19, 0, 0], [16, 10, 1, 16, 0, 0], [13, 13, 1, 13, 0, 0], [9, 17, 1, 9, 0, 0]],
  [[34, 10, 1, 34, 0, 0], [28, 16, 1, 28, 0, 0], [22, 22, 1, 22, 0, 0], [16, 28, 1, 16, 0, 0]],
  [[55, 15, 1, 55, 0, 0], [44, 26, 1, 44, 0, 0], [34, 18, 2, 17, 0, 0], [26, 22, 2, 13, 0, 0]],
  [[80, 20, 1, 80, 0, 0], [64, 18, 2, 32, 0, 0], [48, 26, 2, 24, 0, 0], [36, 16, 4, 9, 0, 0]],
  [[108, 26, 1, 108, 0, 0], [86, 24, 2, 43, 0, 0], [62, 18, 2, 15, 2, 16], [46, 22, 2, 11, 2, 12]],
  [[136, 18, 2, 68, 0, 0], [108, 16, 4, 27, 0, 0], [76, 24, 4, 19, 0, 0], [60, 28, 4, 15, 0, 0]],
  [[156, 20, 2, 78, 0, 0], [124, 18, 4, 31, 0, 0], [88, 18, 2, 14, 4, 15], [66, 26, 4, 13, 1, 14]],
  [[194, 24, 2, 97, 0, 0], [154, 22, 2, 38, 2, 39], [110, 22, 4, 18, 2, 19], [86, 26, 4, 14, 2, 15]],
  [[232, 30, 2, 116, 0, 0], [182, 22, 3, 36, 2, 37], [132, 20, 4, 16, 4, 17], [100, 24, 4, 12, 4, 13]],
  // v10
  [[274, 18, 2, 68, 2, 69], [216, 26, 4, 43, 1, 44], [154, 24, 6, 19, 2, 20], [122, 28, 6, 15, 2, 16]],
  [[324, 20, 4, 81, 0, 0], [254, 30, 1, 50, 4, 51], [180, 28, 4, 22, 4, 23], [140, 24, 3, 12, 8, 13]],
  [[370, 24, 2, 92, 2, 93], [290, 22, 6, 36, 2, 37], [206, 26, 4, 20, 6, 21], [158, 28, 7, 14, 4, 15]],
  [[428, 26, 4, 107, 0, 0], [334, 22, 8, 37, 1, 38], [244, 24, 8, 20, 4, 21], [180, 22, 12, 11, 4, 12]],
  [[461, 30, 3, 115, 1, 116], [365, 24, 4, 40, 5, 41], [261, 20, 11, 16, 5, 17], [197, 24, 11, 12, 5, 13]],
  [[523, 22, 5, 87, 1, 88], [415, 24, 5, 41, 5, 42], [295, 30, 5, 24, 7, 25], [223, 24, 11, 12, 7, 13]],
  [[589, 24, 5, 98, 1, 99], [453, 28, 7, 45, 3, 46], [325, 24, 15, 19, 2, 20], [253, 30, 3, 15, 13, 16]],
  [[647, 28, 1, 107, 5, 108], [507, 28, 10, 46, 1, 47], [367, 28, 1, 22, 15, 23], [283, 28, 2, 14, 17, 15]],
  [[721, 30, 5, 120, 1, 121], [563, 26, 9, 43, 4, 44], [397, 28, 17, 22, 1, 23], [313, 28, 2, 14, 19, 15]],
  [[795, 28, 3, 113, 4, 114], [627, 26, 3, 44, 11, 45], [445, 26, 17, 21, 4, 22], [341, 26, 9, 13, 16, 14]],
  // v20
  [[861, 28, 3, 107, 5, 108], [669, 26, 3, 41, 13, 42], [485, 30, 15, 24, 5, 25], [385, 28, 15, 15, 10, 16]],
  [[932, 28, 4, 116, 4, 117], [714, 26, 17, 42, 0, 0], [512, 28, 17, 22, 6, 23], [406, 30, 19, 16, 6, 17]],
  [[1006, 28, 2, 111, 7, 112], [782, 28, 17, 46, 0, 0], [568, 30, 7, 24, 16, 25], [442, 24, 34, 13, 0, 0]],
  [[1094, 30, 4, 121, 5, 122], [860, 28, 4, 47, 14, 48], [614, 30, 11, 24, 14, 25], [464, 30, 16, 15, 14, 16]],
  [[1174, 30, 6, 117, 4, 118], [914, 28, 6, 45, 14, 46], [664, 30, 11, 24, 16, 25], [514, 30, 30, 16, 2, 17]],
  [[1276, 26, 8, 106, 4, 107], [1000, 28, 8, 47, 13, 48], [718, 30, 7, 24, 22, 25], [538, 30, 22, 15, 13, 16]],
  [[1370, 28, 10, 114, 2, 115], [1062, 28, 19, 46, 4, 47], [754, 28, 28, 22, 6, 23], [596, 30, 33, 16, 4, 17]],
  [[1468, 30, 8, 122, 4, 123], [1128, 28, 22, 45, 3, 46], [808, 30, 8, 23, 26, 24], [628, 30, 12, 15, 28, 16]],
  [[1531, 30, 3, 117, 10, 118], [1193, 28, 3, 45, 23, 46], [871, 30, 4, 24, 31, 25], [661, 30, 11, 15, 31, 16]],
  [[1631, 30, 7, 116, 7, 117], [1267, 28, 21, 45, 7, 46], [911, 30, 1, 23, 37, 24], [701, 30, 19, 15, 26, 16]],
  // v30
  [[1735, 30, 5, 115, 10, 116], [1373, 28, 19, 47, 10, 48], [985, 30, 15, 24, 25, 25], [745, 30, 23, 15, 25, 16]],
  [[1843, 30, 13, 115, 3, 116], [1455, 28, 2, 46, 29, 47], [1033, 30, 42, 24, 1, 25], [793, 30, 23, 15, 28, 16]],
  [[1955, 30, 17, 115, 0, 0], [1541, 28, 10, 46, 23, 47], [1115, 30, 10, 24, 35, 25], [845, 30, 19, 15, 35, 16]],
  [[2071, 30, 17, 115, 1, 116], [1631, 28, 14, 46, 21, 47], [1171, 30, 29, 24, 19, 25], [901, 30, 11, 15, 46, 16]],
  [[2191, 30, 13, 115, 6, 116], [1725, 28, 14, 46, 23, 47], [1231, 30, 44, 24, 7, 25], [961, 30, 59, 16, 1, 17]],
  [[2306, 30, 12, 121, 7, 122], [1812, 28, 12, 47, 26, 48], [1286, 30, 39, 24, 14, 25], [986, 30, 22, 15, 41, 16]],
  [[2434, 30, 6, 121, 14, 122], [1914, 28, 6, 47, 34, 48], [1354, 30, 46, 24, 10, 25], [1054, 30, 2, 15, 64, 16]],
  [[2566, 30, 17, 122, 4, 123], [1992, 28, 29, 46, 14, 47], [1426, 30, 49, 24, 10, 25], [1096, 30, 24, 15, 46, 16]],
  [[2702, 30, 4, 122, 18, 123], [2102, 28, 13, 46, 32, 47], [1502, 30, 48, 24, 14, 25], [1142, 30, 42, 15, 32, 16]],
  [[2812, 30, 20, 117, 4, 118], [2216, 28, 40, 47, 7, 48], [1582, 30, 43, 24, 22, 25], [1222, 30, 10, 15, 67, 16]],
  // v40
  [[2956, 30, 19, 118, 6, 119], [2334, 28, 18, 47, 31, 48], [1666, 30, 34, 24, 34, 25], [1276, 30, 20, 15, 61, 16]],
];

export const MIN_VERSION = 1;
export const MAX_VERSION = 40;

/** Block structure for a version and error correction level. */
export function blockLayout(version: number, ec: QrErrorCorrection): BlockLayout {
  const row = BLOCK_TABLE[version - 1]?.[EC_LEVELS.indexOf(ec)];
  if (!row) {
    throw new RangeError(`No block layout for version ${version} level ${ec}`);
  }
  const [dataCodewords, ecPerBlock, g1Blocks, g1Size, g2Blocks, g2Size] = row;
  return { dataCodewords, ecPerBlock, g1Blocks, g1Size, g2Blocks, g2Size };
}

/**
 * The 15-bit format information for a level and mask, as published.
 *
 * These are a BCH(15,5) code XOR'd with a fixed mask, so they could be
 * computed — and the first draft did compute them. They are listed instead
 * because the computation and its verification would then share one
 * implementation: a wrong generator polynomial would produce a wrong table and
 * a test that agreed with it. A transcribed table cannot agree with a bug.
 *
 * Source: <https://www.thonky.com/qr-code-tutorial/format-version-tables>.
 * Indexed `[level][mask]`.
 */
export const FORMAT_BITS: Record<QrErrorCorrection, readonly number[]> = {
  L: [
    0b111011111000100, 0b111001011110011, 0b111110110101010, 0b111100010011101,
    0b110011000101111, 0b110001100011000, 0b110110001000001, 0b110100101110110,
  ],
  M: [
    0b101010000010010, 0b101000100100101, 0b101111001111100, 0b101101101001011,
    0b100010111111001, 0b100000011001110, 0b100111110010111, 0b100101010100000,
  ],
  Q: [
    0b011010101011111, 0b011000001101000, 0b011111100110001, 0b011101000000110,
    0b010010010110100, 0b010000110000011, 0b010111011011010, 0b010101111101101,
  ],
  H: [
    0b001011010001001, 0b001001110111110, 0b001110011100111, 0b001100111010000,
    0b000011101100010, 0b000001001010101, 0b000110100001100, 0b000100000111011,
  ],
};

/**
 * The 18-bit version information, present only for versions 7 and up.
 *
 * A BCH(18,6) code. Computed rather than tabled — 34 rows of 18 bits is more
 * transcription risk than the arithmetic is, and unlike the format bits there
 * are published values for versions 7, 8, 9, 10 and 40 to check it against,
 * which the test does.
 */
export function versionBits(version: number): number {
  let remainder = version;
  for (let i = 0; i < 12; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0b1111100100101);
  }
  return ((version << 12) | remainder) >>> 0;
}

/**
 * Centre coordinates of the alignment patterns for a version.
 *
 * Derived rather than tabled, and the derivation is checked by the codeword
 * count equation in the test: a wrong position changes how many modules are
 * free for data, so the count would not match the block table.
 *
 * Version 32 is a genuine special case in the standard — its spacing does not
 * follow the rule the other versions do.
 */
export function alignmentPositions(version: number): number[] {
  if (version === 1) {
    return [];
  }
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = version === 32 ? 26 : Math.ceil((size - 13) / (count * 2 - 2)) * 2;

  const positions = [6];
  for (let pos = size - 7; positions.length < count; pos -= step) {
    positions.unshift(pos);
  }
  return positions.sort((a, b) => a - b);
}

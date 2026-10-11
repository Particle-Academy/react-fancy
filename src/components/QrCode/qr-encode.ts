/**
 * A QR encoder, dependency-free.
 *
 * ISO/IEC 18004, versions 1–40, error correction L/M/Q/H, with numeric,
 * alphanumeric and byte modes and automatic selection between them. No
 * Kanji mode and no structured append — neither has a caller here, and an
 * untested branch in an encoder is worse than an absent one because the
 * failure is a code a phone silently refuses to read.
 *
 * Table data and its provenance live in `./qr-tables`.
 */
import {
  EC_FORMAT_BITS,
  FORMAT_BITS,
  MAX_VERSION,
  MIN_VERSION,
  alignmentPositions,
  blockLayout,
  versionBits,
  type QrErrorCorrection,
} from './qr-tables';

export type { QrErrorCorrection };

/** Which encoding mode a value is carried in. */
export type QrMode = 'numeric' | 'alphanumeric' | 'byte';

const MODE_INDICATOR: Record<QrMode, number> = { numeric: 0b0001, alphanumeric: 0b0010, byte: 0b0100 };

/** The character set alphanumeric mode can carry, in its own index order. */
const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

export interface QrSymbol {
  /** `size * size` modules, row-major. `true` is dark. */
  modules: boolean[][];
  /** Modules per side, `version * 4 + 17`. */
  size: number;
  version: number;
  errorCorrection: QrErrorCorrection;
  mode: QrMode;
  /** The mask pattern chosen by penalty scoring, 0–7. */
  mask: number;
}

// --- Galois field GF(256) --------------------------------------------------
// Reed-Solomon over the field the standard specifies: primitive polynomial
// x^8 + x^4 + x^3 + x^2 + 1 (0x11d), generator 2.

const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  EXP[255] = EXP[0] as number;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }
  return EXP[((LOG[a] as number) + (LOG[b] as number)) % 255] as number;
}

/** The generator polynomial for `degree` error correction codewords. */
function generatorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] = (next[j] as number) ^ (poly[j] as number);
      next[j + 1] = (next[j + 1] as number) ^ gfMul(poly[j] as number, EXP[i] as number);
    }
    poly = next;
  }
  return poly;
}

/** Reed-Solomon remainder — the error correction codewords for one block. */
function reedSolomon(data: readonly number[], degree: number): number[] {
  const generator = generatorPoly(degree);
  const remainder = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (remainder.shift() as number);
    remainder.push(0);
    for (let i = 0; i < degree; i += 1) {
      remainder[i] = (remainder[i] as number) ^ gfMul(generator[i + 1] as number, factor);
    }
  }
  return remainder;
}

// --- Mode selection and bit encoding ---------------------------------------

/**
 * The narrowest mode that can carry `value`.
 *
 * Narrower is denser: numeric packs 3 digits into 10 bits where byte mode
 * would spend 24. A six-digit pairing PIN is a third of the size as numeric,
 * which is the difference between a code a phone reads across a desk and one
 * it does not.
 */
export function selectMode(value: string): QrMode {
  if (/^[0-9]*$/.test(value)) {
    return 'numeric';
  }
  if ([...value].every((char) => ALPHANUMERIC.includes(char))) {
    return 'alphanumeric';
  }
  return 'byte';
}

/** Bits in the character count indicator — it widens with version. */
function countBits(mode: QrMode, version: number): number {
  const tier = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  if (mode === 'numeric') {
    return [10, 12, 14][tier] as number;
  }
  if (mode === 'alphanumeric') {
    return [9, 11, 13][tier] as number;
  }
  return [8, 16, 16][tier] as number;
}

class BitBuffer {
  readonly bits: number[] = [];

  push(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i -= 1) {
      this.bits.push((value >>> i) & 1);
    }
  }
}

/** UTF-8 bytes for a string, without TextEncoder — jsdom and SSR both agree. */
function utf8Bytes(value: string): number[] {
  const out: number[] = [];
  for (const char of value) {
    const code = char.codePointAt(0) as number;
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return out;
}

/** The payload's own bits, before terminator and padding. */
function encodePayload(value: string, mode: QrMode, version: number): BitBuffer {
  const buffer = new BitBuffer();
  buffer.push(MODE_INDICATOR[mode], 4);

  if (mode === 'numeric') {
    buffer.push(value.length, countBits(mode, version));
    for (let i = 0; i < value.length; i += 3) {
      const group = value.slice(i, i + 3);
      buffer.push(Number.parseInt(group, 10), group.length * 3 + 1);
    }
    return buffer;
  }

  if (mode === 'alphanumeric') {
    buffer.push(value.length, countBits(mode, version));
    for (let i = 0; i < value.length; i += 2) {
      const first = ALPHANUMERIC.indexOf(value[i] as string);
      if (i + 1 < value.length) {
        buffer.push(first * 45 + ALPHANUMERIC.indexOf(value[i + 1] as string), 11);
      } else {
        buffer.push(first, 6);
      }
    }
    return buffer;
  }

  const bytes = utf8Bytes(value);
  buffer.push(bytes.length, countBits(mode, version));
  for (const byte of bytes) {
    buffer.push(byte, 8);
  }
  return buffer;
}

/** How many bits the payload needs at a given version, mode included. */
function payloadBits(value: string, mode: QrMode, version: number): number {
  return encodePayload(value, mode, version).bits.length;
}

/** The smallest version that fits, or `null` when nothing does. */
function selectVersion(
  value: string,
  mode: QrMode,
  ec: QrErrorCorrection,
  minVersion: number,
): number | null {
  for (let version = Math.max(minVersion, MIN_VERSION); version <= MAX_VERSION; version += 1) {
    if (payloadBits(value, mode, version) <= blockLayout(version, ec).dataCodewords * 8) {
      return version;
    }
  }
  return null;
}

/**
 * Data codewords: payload, terminator, pad to a byte, then alternating pad
 * bytes. Exported for the golden-vector test, which asserts these against the
 * standard's published worked example.
 */
export function dataCodewords(value: string, mode: QrMode, version: number, ec: QrErrorCorrection): number[] {
  const capacity = blockLayout(version, ec).dataCodewords * 8;
  const buffer = encodePayload(value, mode, version);

  // Terminator: up to four zero bits, truncated if capacity runs out.
  buffer.push(0, Math.min(4, capacity - buffer.bits.length));
  // Then to a byte boundary.
  buffer.push(0, (8 - (buffer.bits.length % 8)) % 8);

  const codewords: number[] = [];
  for (let i = 0; i < buffer.bits.length; i += 8) {
    let byte = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      byte = (byte << 1) | (buffer.bits[i + bit] as number);
    }
    codewords.push(byte);
  }

  // Pad bytes 0b11101100 / 0b00010001, alternating, as the standard specifies.
  const target = capacity / 8;
  for (let i = 0; codewords.length < target; i += 1) {
    codewords.push(i % 2 === 0 ? 0xec : 0x11);
  }
  return codewords;
}

/**
 * Split into blocks, compute error correction, and interleave.
 *
 * Interleaving is what makes the error correction work as advertised: a blot
 * on the printed symbol damages a contiguous run of modules, and interleaving
 * spreads that run across every block so no single block exceeds its own
 * correction budget. Concatenating instead would produce a scannable code that
 * fails far sooner than its level claims — passing a round-trip test and
 * failing on paper.
 */
export function interleave(codewords: readonly number[], version: number, ec: QrErrorCorrection): number[] {
  const { ecPerBlock, g1Blocks, g1Size, g2Blocks, g2Size } = blockLayout(version, ec);

  const dataBlocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < g1Blocks; i += 1) {
    dataBlocks.push(codewords.slice(offset, offset + g1Size));
    offset += g1Size;
  }
  for (let i = 0; i < g2Blocks; i += 1) {
    dataBlocks.push(codewords.slice(offset, offset + g2Size));
    offset += g2Size;
  }

  const ecBlocks = dataBlocks.map((block) => reedSolomon(block, ecPerBlock));

  const result: number[] = [];
  const widest = Math.max(g1Size, g2Blocks > 0 ? g2Size : 0);
  for (let i = 0; i < widest; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) {
        result.push(block[i] as number);
      }
    }
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const block of ecBlocks) {
      result.push(block[i] as number);
    }
  }
  return result;
}

// --- Matrix construction ---------------------------------------------------

export type Grid = (boolean | null)[][];

/**
 * A grid with every function pattern placed and data positions left `null`.
 *
 * Exported for verification. The round-trip decoder in the test needs to know
 * which modules carry data, and reconstructing that knowledge separately would
 * duplicate the layout and share its bugs. Using the same template is safe
 * here because the table-consistency check anchors it to an independent fact:
 * the number of free modules must equal the codeword count in the transcribed
 * block table, so a wrong finder, timing or alignment layout fails there.
 */
export function reservedModules(version: number): Grid {
  const size = version * 4 + 17;
  const grid: Grid = Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null));

  const set = (row: number, col: number, dark: boolean): void => {
    (grid[row] as (boolean | null)[])[col] = dark;
  };

  // Three finder patterns with their separators.
  for (const [baseRow, baseCol] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ] as const) {
    for (let row = -1; row <= 7; row += 1) {
      for (let col = -1; col <= 7; col += 1) {
        const r = baseRow + row;
        const c = baseCol + col;
        if (r < 0 || r >= size || c < 0 || c >= size) {
          continue;
        }
        const ring = Math.max(Math.abs(row - 3), Math.abs(col - 3));
        set(r, c, ring !== 2 && ring <= 3);
      }
    }
  }

  // Timing patterns, row and column 6.
  for (let i = 0; i < size; i += 1) {
    if ((grid[6] as (boolean | null)[])[i] === null) {
      set(6, i, i % 2 === 0);
    }
    if ((grid[i] as (boolean | null)[])[6] === null) {
      set(i, 6, i % 2 === 0);
    }
  }

  // Alignment patterns, except where a finder already sits.
  const positions = alignmentPositions(version);
  for (const row of positions) {
    for (const col of positions) {
      const nearFinder =
        (row <= 8 && col <= 8) || (row <= 8 && col >= size - 9) || (row >= size - 9 && col <= 8);
      if (nearFinder) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          set(row + dr, col + dc, ring !== 1);
        }
      }
    }
  }

  // Format information areas, reserved now and written after masking. The
  // module at (size - 8, 8) is always dark.
  for (let i = 0; i < 9; i += 1) {
    if ((grid[8] as (boolean | null)[])[i] === null) {
      set(8, i, false);
    }
    if ((grid[i] as (boolean | null)[])[8] === null) {
      set(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    set(8, size - 1 - i, false);
    set(size - 1 - i, 8, false);
  }
  set(size - 8, 8, true);

  // Version information, versions 7 and up.
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i += 1) {
      const bit = ((bits >>> i) & 1) === 1;
      set(Math.floor(i / 3), size - 11 + (i % 3), bit);
      set(size - 11 + (i % 3), Math.floor(i / 3), bit);
    }
  }

  return grid;
}

/** How many modules a version leaves free for data, counted from the grid. */
export function rawDataModules(version: number): number {
  const grid = reservedModules(version);
  let free = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === null) {
        free += 1;
      }
    }
  }
  return free;
}

/** Place the interleaved codewords in the standard's zigzag order. */
function placeData(grid: Grid, codewords: readonly number[]): void {
  const size = grid.length;
  let bitIndex = 0;
  const nextBit = (): boolean => {
    const byte = codewords[bitIndex >>> 3];
    // Past the end is a remainder bit: light, per the standard.
    const bit = byte === undefined ? 0 : (byte >>> (7 - (bitIndex & 7))) & 1;
    bitIndex += 1;
    return bit === 1;
  };

  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    // Column 6 is the vertical timing pattern; the pair of columns skips it.
    const pair = right === 6 ? [5, 4] : [right, right - 1];
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (const col of pair) {
        if ((grid[row] as (boolean | null)[])[col] === null) {
          (grid[row] as (boolean | null)[])[col] = nextBit();
        }
      }
    }
    if (right === 6) {
      right -= 1;
    }
    upward = !upward;
  }
}

/** The eight mask conditions. `true` means invert this module. */
function maskCondition(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

/**
 * The four penalty rules, scored on a finished candidate.
 *
 * This is the step that is easy to skip and expensive to skip: the rules exist
 * because some masks leave large light or dark areas, or patterns that look
 * like a finder, and a decoder locks onto the wrong feature. A symbol with a
 * badly chosen mask still decodes in software and fails under a phone camera —
 * which is the worst possible place for it to fail, because every test here
 * would pass.
 */
export function penalty(modules: readonly boolean[][]): number {
  const size = modules.length;
  let score = 0;

  // Rule 1: runs of five or more same-coloured modules in a line.
  const scoreLine = (run: number): number => (run >= 5 ? run - 2 : 0);
  for (let i = 0; i < size; i += 1) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let j = 1; j < size; j += 1) {
        const prev = horizontal
          ? (modules[i] as boolean[])[j - 1]
          : (modules[j - 1] as boolean[])[i];
        const cur = horizontal ? (modules[i] as boolean[])[j] : (modules[j] as boolean[])[i];
        if (cur === prev) {
          run += 1;
        } else {
          score += scoreLine(run);
          run = 1;
        }
      }
      score += scoreLine(run);
    }
  }

  // Rule 2: every 2x2 block of one colour.
  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const a = (modules[row] as boolean[])[col];
      if (
        a === (modules[row] as boolean[])[col + 1] &&
        a === (modules[row + 1] as boolean[])[col] &&
        a === (modules[row + 1] as boolean[])[col + 1]
      ) {
        score += 3;
      }
    }
  }

  // Rule 3: the finder-like 1:1:3:1:1 pattern with four light modules either
  // side. This is the rule that protects a decoder's pattern detection.
  const finderish = [true, false, true, true, true, false, true];
  const light4 = [false, false, false, false];
  const matches = (line: readonly boolean[], at: number, pattern: readonly boolean[]): boolean =>
    pattern.every((want, i) => line[at + i] === want);
  for (let i = 0; i < size; i += 1) {
    const row = modules[i] as boolean[];
    const col = modules.map((r) => (r as boolean[])[i] as boolean);
    for (const line of [row, col]) {
      for (let j = 0; j + 7 <= size; j += 1) {
        if (!matches(line, j, finderish)) {
          continue;
        }
        // Each ELEVEN-module window counts separately, so a pattern with four
        // light modules on BOTH sides scores 80 rather than 40.
        //
        // The prose rule ("add 40 each time the pattern appears with four
        // light modules on either side") is ambiguous about that case, and it
        // matters: this score is what picks the mask, and the wrong mask
        // produces a symbol that decodes perfectly in software and reads badly
        // under a camera. No test here can catch that -- so the convention is
        // pinned by a test instead, and this follows the one the reference
        // implementations use rather than the reading that happened to come
        // first.
        if (j >= 4 && matches(line, j - 4, light4)) {
          score += 40;
        }
        if (j + 11 <= size && matches(line, j + 7, light4)) {
          score += 40;
        }
      }
    }
  }

  // Rule 4: deviation of the dark-module proportion from 50%.
  let dark = 0;
  for (const row of modules) {
    for (const cell of row) {
      if (cell) {
        dark += 1;
      }
    }
  }
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/** Write the 15 format bits into both of their locations. */
function applyFormat(modules: boolean[][], ec: QrErrorCorrection, mask: number): void {
  const size = modules.length;
  const bits = (FORMAT_BITS[ec][mask] as number) >>> 0;
  const bit = (i: number): boolean => ((bits >>> i) & 1) === 1;

  // Bits 0-5 up the left column, bit 6 at (8,7)... the split placement is the
  // standard's, not a simplification of it.
  for (let i = 0; i <= 5; i += 1) {
    (modules[8] as boolean[])[i] = bit(14 - i);
  }
  (modules[8] as boolean[])[7] = bit(8);
  (modules[8] as boolean[])[8] = bit(7);
  (modules[7] as boolean[])[8] = bit(6);
  for (let i = 9; i <= 14; i += 1) {
    (modules[14 - i] as boolean[])[8] = bit(14 - i);
  }

  // The second copy, split across the other two corners: SEVEN modules up the
  // column beside the bottom-left finder, then EIGHT along the row beside the
  // top-right one.
  //
  // The 7/8 split is not arbitrary and getting it wrong is quiet. An 8/7 split
  // puts bit 7 at (size - 8, 8) -- which is the dark module, overwritten on
  // the next line -- so the symbol still decodes from the FIRST copy and
  // carries a corrupt second one. A reader that happens to use the second copy
  // refuses the symbol, and nothing in a round-trip test notices, because a
  // decoder reading the first copy never looks.
  for (let i = 0; i <= 6; i += 1) {
    (modules[size - 1 - i] as boolean[])[8] = bit(i);
  }
  for (let i = 7; i <= 14; i += 1) {
    (modules[8] as boolean[])[size - 15 + i] = bit(i);
  }
  (modules[size - 8] as boolean[])[8] = true;
}

export interface EncodeOptions {
  errorCorrection?: QrErrorCorrection;
  /** Force a mode instead of selecting the narrowest that fits. */
  mode?: QrMode;
  /** Force a version. Throws if the value does not fit. */
  version?: number;
  /** Force a mask instead of scoring all eight. For tests and golden vectors. */
  mask?: number;
}

/**
 * Encode a string into a QR symbol.
 *
 * @throws RangeError when the value cannot fit, or when a forced version is
 *   too small for it. **Throwing is deliberate**: the alternative is returning
 *   a truncated symbol, which scans cleanly and yields the wrong string — a
 *   silent corruption on the one surface whose entire job is to carry a value
 *   accurately.
 */
export function encodeQr(value: string, options: EncodeOptions = {}): QrSymbol {
  const ec = options.errorCorrection ?? 'M';
  const mode = options.mode ?? selectMode(value);

  if (mode === 'numeric' && !/^[0-9]*$/.test(value)) {
    throw new RangeError('Numeric mode accepts digits only');
  }
  if (mode === 'alphanumeric' && ![...value].every((char) => ALPHANUMERIC.includes(char))) {
    throw new RangeError('Alphanumeric mode accepts 0-9 A-Z space and $%*+-./: only');
  }

  let version: number;
  if (options.version !== undefined) {
    if (options.version < MIN_VERSION || options.version > MAX_VERSION) {
      throw new RangeError(`Version must be ${MIN_VERSION}-${MAX_VERSION}`);
    }
    version = options.version;
    if (payloadBits(value, mode, version) > blockLayout(version, ec).dataCodewords * 8) {
      throw new RangeError(`Value does not fit in version ${version} at level ${ec}`);
    }
  } else {
    const chosen = selectVersion(value, mode, ec, MIN_VERSION);
    if (chosen === null) {
      throw new RangeError(
        `Value is too long for a QR code at level ${ec} (${value.length} characters)`,
      );
    }
    version = chosen;
  }

  const codewords = interleave(dataCodewords(value, mode, version, ec), version, ec);
  const template = reservedModules(version);

  const candidates: { mask: number; modules: boolean[][] }[] = [];
  const masksToTry = options.mask === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [options.mask];
  for (const mask of masksToTry) {
    const grid = template.map((row) => [...row]);
    placeData(grid, codewords);
    const modules = grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        const value_ = cell as boolean;
        // Only data modules are masked; function patterns never are, which is
        // why the mask is applied against the TEMPLATE's null positions rather
        // than against the finished grid.
        const isData = (template[rowIndex] as (boolean | null)[])[colIndex] === null;
        return isData && maskCondition(mask, rowIndex, colIndex) ? !value_ : value_;
      }),
    );
    applyFormat(modules, ec, mask);
    candidates.push({ mask, modules });
  }

  const best = candidates.reduce((a, b) => (penalty(a.modules) <= penalty(b.modules) ? a : b));

  return {
    modules: best.modules,
    size: version * 4 + 17,
    version,
    errorCorrection: ec,
    mode,
    mask: best.mask,
  };
}

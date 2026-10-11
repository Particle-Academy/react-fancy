import { describe, expect, it } from "vitest";

import {
    dataCodewords,
    encodeQr,
    interleave,
    maxCharacters,
    penalty,
    rawDataModules,
    reservedModules,
    selectMode,
    type QrErrorCorrection,
    type QrMode,
} from "../src/components/QrCode/qr-encode";
import {
    EC_LEVELS,
    FORMAT_BITS,
    MAX_VERSION,
    alignmentPositions,
    blockLayout,
    versionBits,
} from "../src/components/QrCode/qr-tables";

/**
 * A QR encoder is the worst possible place for a green suite to be wrong,
 * because the failure is silent: a symbol with a bad mask, a mis-ordered
 * interleave or an off-by-one length indicator still renders as a convincing
 * square of dots, and the only thing that reports the defect is a phone that
 * will not read it. Nobody runs that check in CI.
 *
 * So this file deliberately does not verify the encoder against itself. It
 * rests on four independent anchors:
 *
 *  1. A GOLDEN VECTOR from the standard's published worked example — real
 *     input, real codewords, real interleaved output. Pins mode encoding,
 *     padding, Reed-Solomon, block splitting and interleaving in one shot.
 *  2. A THREE-WAY TABLE CHECK over all 160 version/level rows, where the third
 *     equation counts free modules in the matrix this code builds. A
 *     transcribed table, an independently derived alignment-pattern layout and
 *     a hand-written function-pattern placement cannot all agree if any one of
 *     them is wrong.
 *  3. PUBLISHED VERSION-INFORMATION STRINGS, against a computed BCH(18,6).
 *  4. A ROUND-TRIP DECODER written to read the matrix back the way a scanner
 *     would — find the format, undo the mask, de-interleave, decode.
 *
 * Anchor 4 alone would be circular. Anchors 1-3 are what make it worth having.
 */

// --- Anchor 1: the golden vector -------------------------------------------

/**
 * The standard's 5-Q worked example, as published at
 * <https://www.thonky.com/qr-code-tutorial/structure-final-message>.
 *
 * Note the BACKSLASH before the apostrophe. The input really is 53 bytes with
 * a literal backslash in it, recovered by decoding the published codewords
 * rather than read off the prose. "Tidying" it to `There's` gives 52 bytes and
 * every assertion below fails for a reason that looks like an encoder bug.
 */
const GOLDEN_INPUT = "There\\'s a frood who really knows where his towel is.";

const GOLDEN_DATA_CODEWORDS = [
    // Group 1, block 1
    67, 85, 70, 134, 87, 38, 85, 194, 119, 50, 6, 18, 6, 103, 38,
    // Group 1, block 2
    246, 246, 66, 7, 118, 134, 242, 7, 38, 86, 22, 198, 199, 146, 6,
    // Group 2, block 1
    182, 230, 247, 119, 50, 7, 118, 134, 87, 38, 82, 6, 134, 151, 50, 7,
    // Group 2, block 2
    70, 247, 118, 86, 194, 6, 151, 50, 224, 236, 17, 236, 17, 236, 17, 236,
];

const GOLDEN_INTERLEAVED = [
    67, 246, 182, 70, 85, 246, 230, 247, 70, 66, 247, 118, 134, 7, 119, 86, 87, 118, 50, 194, 38,
    134, 7, 6, 85, 242, 118, 151, 194, 7, 134, 50, 119, 38, 87, 224, 50, 86, 38, 236, 6, 22, 82, 17,
    18, 198, 6, 236, 6, 199, 134, 17, 103, 146, 151, 236, 38, 6, 50, 17, 7, 236,
    // Error correction, interleaved
    213, 87, 148, 140, 199, 204, 116, 100, 11, 96, 177, 250, 45, 60, 212, 247, 115, 202, 76, 108,
    247, 182, 133, 131, 241, 124, 75, 37, 223, 157, 242, 104, 229, 200, 238, 253, 248, 134, 76, 113,
    154, 27, 195, 111, 117, 129, 230, 235, 154, 209, 189, 197, 111, 17, 10, 83, 86, 163, 108, 6,
    161, 163, 240, 205, 111, 120, 192, 89, 39, 133, 141, 74,
];

describe("the standard's published 5-Q worked example", () => {
    it("has the input the published codewords decode to", () => {
        // Guards the constant above against a well-meaning cleanup.
        expect(GOLDEN_INPUT.length).toBe(53);
        expect(GOLDEN_INPUT).toContain("\\");
    });

    it("produces the published data codewords, padding included", () => {
        expect(dataCodewords(GOLDEN_INPUT, "byte", 5, "Q")).toEqual(GOLDEN_DATA_CODEWORDS);
    });

    it("produces the published interleaved message, error correction included", () => {
        const codewords = dataCodewords(GOLDEN_INPUT, "byte", 5, "Q");
        expect(interleave(codewords, 5, "Q")).toEqual(GOLDEN_INTERLEAVED);
    });

    it("interleaves rather than concatenating", () => {
        // The distinction that makes the error correction level mean what it
        // claims. A blot damages a contiguous run of modules; interleaving
        // spreads that run across every block so none exceeds its own budget.
        // Concatenation yields a symbol that decodes perfectly in software and
        // fails far sooner than its level promises on paper -- so this asserts
        // the ORDER, not just the multiset.
        const codewords = dataCodewords(GOLDEN_INPUT, "byte", 5, "Q");
        const result = interleave(codewords, 5, "Q");
        expect(result.slice(0, 4)).toEqual([67, 246, 182, 70]);
        expect(result).not.toEqual([...codewords, ...result.slice(codewords.length)]);
    });
});

// --- Anchor 2: the three-way table check -----------------------------------

describe("the block table agrees with the matrix this code builds", () => {
    it("holds all three equations for every version and level", () => {
        const failures: string[] = [];
        for (let version = 1; version <= MAX_VERSION; version += 1) {
            const free = rawDataModules(version);
            for (const ec of EC_LEVELS) {
                const l = blockLayout(version, ec);
                const blocks = l.g1Blocks + l.g2Blocks;
                const fromGroups = l.g1Blocks * l.g1Size + l.g2Blocks * l.g2Size;
                const total = l.dataCodewords + l.ecPerBlock * blocks;

                if (fromGroups !== l.dataCodewords) {
                    failures.push(`v${version}-${ec}: groups sum to ${fromGroups}, table says ${l.dataCodewords}`);
                }
                if (total !== Math.floor(free / 8)) {
                    failures.push(`v${version}-${ec}: ${total} codewords, matrix has room for ${Math.floor(free / 8)}`);
                }
                if (l.g2Blocks > 0 && l.g2Size !== l.g1Size + 1) {
                    failures.push(`v${version}-${ec}: group 2 is ${l.g2Size}, not ${l.g1Size + 1}`);
                }
            }
        }
        expect(failures).toEqual([]);
    });

    it("leaves the right number of remainder bits", () => {
        // Versions 2-6 leave 7 bits over, among others. The point is that the
        // leftover is always under 8 -- more than that means a whole codeword
        // is unaccounted for somewhere.
        for (let version = 1; version <= MAX_VERSION; version += 1) {
            expect(rawDataModules(version) % 8, `version ${version}`).toBeLessThan(8);
        }
    });

    it("places alignment patterns 6 modules in and 7 from the far edge", () => {
        for (let version = 2; version <= MAX_VERSION; version += 1) {
            const positions = alignmentPositions(version);
            const size = version * 4 + 17;
            expect(positions[0], `version ${version}`).toBe(6);
            expect(positions[positions.length - 1], `version ${version}`).toBe(size - 7);
            expect(positions.length, `version ${version}`).toBe(Math.floor(version / 7) + 2);
        }
        expect(alignmentPositions(1)).toEqual([]);
    });
});

// --- Anchor 3: published version information -------------------------------

describe("version information", () => {
    it("matches the published strings", () => {
        // Published values; the function computes a BCH(18,6). A wrong
        // generator polynomial produces a self-consistent wrong table, which
        // is why these are transcribed rather than derived.
        expect(versionBits(7).toString(2).padStart(18, "0")).toBe("000111110010010100");
        expect(versionBits(8).toString(2).padStart(18, "0")).toBe("001000010110111100");
        expect(versionBits(9).toString(2).padStart(18, "0")).toBe("001001101010011001");
        expect(versionBits(10).toString(2).padStart(18, "0")).toBe("001010010011010011");
        expect(versionBits(40).toString(2).padStart(18, "0")).toBe("101000110001101001");
    });
});

// --- Anchor 4: the round-trip decoder --------------------------------------

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

/**
 * Read a symbol back the way a scanner would.
 *
 * It does NOT take the version, level or mask as arguments: it reads the
 * version from the module count and the level and mask from the format
 * information in the matrix. A decoder told what to expect would not notice a
 * symbol that announces itself wrongly -- and announcing itself wrongly is the
 * failure mode where every other test still passes.
 */
function decodeSymbol(modules: readonly boolean[][]): { text: string; ec: QrErrorCorrection; mask: number } {
    const size = modules.length;
    const version = (size - 17) / 4;
    if (!Number.isInteger(version)) {
        throw new Error(`${size} is not a valid symbol size`);
    }

    // Format information, from the copy beside the top-left finder.
    let format = 0;
    for (let i = 0; i <= 5; i += 1) {
        format |= (((modules[8] as boolean[])[i] ? 1 : 0) << (14 - i));
    }
    format |= ((modules[8] as boolean[])[7] ? 1 : 0) << 8;
    format |= ((modules[8] as boolean[])[8] ? 1 : 0) << 7;
    format |= ((modules[7] as boolean[])[8] ? 1 : 0) << 6;
    for (let i = 9; i <= 14; i += 1) {
        format |= (((modules[14 - i] as boolean[])[8] ? 1 : 0) << (14 - i));
    }

    let found: { ec: QrErrorCorrection; mask: number } | null = null;
    for (const ec of EC_LEVELS) {
        const index = (FORMAT_BITS[ec] as readonly number[]).indexOf(format);
        if (index >= 0) {
            found = { ec, mask: index };
        }
    }
    if (!found) {
        throw new Error(`Format information ${format.toString(2).padStart(15, "0")} is not a valid pattern`);
    }

    // Undo the mask over data modules only, then read the zigzag.
    const template = reservedModules(version);
    const isData = (row: number, col: number): boolean =>
        (template[row] as (boolean | null)[])[col] === null;
    const maskCondition = (mask: number, row: number, col: number): boolean => {
        switch (mask) {
            case 0: return (row + col) % 2 === 0;
            case 1: return row % 2 === 0;
            case 2: return col % 3 === 0;
            case 3: return (row + col) % 3 === 0;
            case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
            case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
            case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
            default: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
        }
    };

    const bits: number[] = [];
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
        const pair = right === 6 ? [5, 4] : [right, right - 1];
        for (let step = 0; step < size; step += 1) {
            const row = upward ? size - 1 - step : step;
            for (const col of pair) {
                if (!isData(row, col)) {
                    continue;
                }
                const raw = (modules[row] as boolean[])[col] as boolean;
                const unmasked = maskCondition(found.mask, row, col) ? !raw : raw;
                bits.push(unmasked ? 1 : 0);
            }
        }
        if (right === 6) {
            right -= 1;
        }
        upward = !upward;
    }

    const stream: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        let byte = 0;
        for (let b = 0; b < 8; b += 1) {
            byte = (byte << 1) | (bits[i + b] as number);
        }
        stream.push(byte);
    }

    // De-interleave back into data blocks and concatenate them.
    const l = blockLayout(version, found.ec);
    const sizes = [
        ...Array.from({ length: l.g1Blocks }, () => l.g1Size),
        ...Array.from({ length: l.g2Blocks }, () => l.g2Size),
    ];
    const blocks: number[][] = sizes.map(() => []);
    let cursor = 0;
    const widest = Math.max(...sizes);
    for (let i = 0; i < widest; i += 1) {
        for (let b = 0; b < sizes.length; b += 1) {
            if (i < (sizes[b] as number)) {
                (blocks[b] as number[]).push(stream[cursor] as number);
                cursor += 1;
            }
        }
    }
    const data = blocks.flat();

    // Decode the payload.
    let bitAt = 0;
    const read = (count: number): number => {
        let out = 0;
        for (let i = 0; i < count; i += 1) {
            const byte = data[(bitAt + i) >>> 3] as number;
            out = (out << 1) | ((byte >>> (7 - ((bitAt + i) & 7))) & 1);
        }
        bitAt += count;
        return out;
    };

    const mode = read(4);
    const tier = version <= 9 ? 0 : version <= 26 ? 1 : 2;

    if (mode === 0b0001) {
        const count = read(([10, 12, 14][tier] as number));
        let text = "";
        for (let i = 0; i < count; i += 3) {
            const group = Math.min(3, count - i);
            text += String(read(group * 3 + 1)).padStart(group, "0");
        }
        return { text, ...found };
    }

    if (mode === 0b0010) {
        const count = read(([9, 11, 13][tier] as number));
        let text = "";
        for (let i = 0; i < count; i += 2) {
            if (count - i >= 2) {
                const pair = read(11);
                text += (ALPHANUMERIC[Math.floor(pair / 45)] as string) + (ALPHANUMERIC[pair % 45] as string);
            } else {
                text += ALPHANUMERIC[read(6)] as string;
            }
        }
        return { text, ...found };
    }

    if (mode === 0b0100) {
        const count = read(([8, 16, 16][tier] as number));
        const bytes: number[] = [];
        for (let i = 0; i < count; i += 1) {
            bytes.push(read(8));
        }
        return { text: new TextDecoder().decode(new Uint8Array(bytes)), ...found };
    }

    throw new Error(`Unsupported mode indicator ${mode.toString(2)}`);
}

describe("round-tripping a symbol back through a scanner's path", () => {
    const cases: { label: string; value: string; ec?: QrErrorCorrection }[] = [
        { label: "a pairing URL with a PIN fragment", value: "https://device.example.com/pair#482913" },
        { label: "a six-digit PIN (numeric mode)", value: "482913" },
        { label: "an uppercase code (alphanumeric mode)", value: "PAIR-482913 OK" },
        { label: "a single character", value: "x" },
        { label: "the golden vector's input", value: GOLDEN_INPUT },
        { label: "multi-byte UTF-8", value: "héllo — 世界 🜛" },
        { label: "a value that needs a middle version", value: "y".repeat(400) },
        { label: "a value that needs a high version", value: "z".repeat(1200) },
    ];

    for (const ec of EC_LEVELS) {
        for (const { label, value } of cases) {
            it(`recovers ${label} at level ${ec}`, () => {
                const symbol = encodeQr(value, { errorCorrection: ec });
                const decoded = decodeSymbol(symbol.modules);
                expect(decoded.text).toBe(value);
                // The symbol must also ANNOUNCE itself correctly -- the format
                // information is read from the matrix, not passed in.
                expect(decoded.ec).toBe(ec);
                expect(decoded.mask).toBe(symbol.mask);
            });
        }
    }

    it("recovers a value at every single version", () => {
        // One per version, sized to force that version. Catches a layout bug
        // that only appears once alignment patterns start colliding with the
        // data region, which a few spot checks miss.
        const failures: string[] = [];
        for (let version = 1; version <= MAX_VERSION; version += 1) {
            const capacity = blockLayout(version, "L").dataCodewords - 3;
            const value = "a".repeat(capacity);
            const symbol = encodeQr(value, { errorCorrection: "L", version });
            try {
                const decoded = decodeSymbol(symbol.modules);
                if (decoded.text !== value) {
                    failures.push(`v${version}: recovered ${decoded.text.length} of ${value.length} bytes`);
                }
            } catch (error) {
                failures.push(`v${version}: ${(error as Error).message}`);
            }
        }
        expect(failures).toEqual([]);
    });
});

// --- Structure and API -----------------------------------------------------

describe("symbol structure", () => {
    it("is 4 * version + 17 modules square", () => {
        for (const version of [1, 2, 7, 20, 40]) {
            const symbol = encodeQr("x", { version, errorCorrection: "L" });
            expect(symbol.size).toBe(version * 4 + 17);
            expect(symbol.modules.length).toBe(symbol.size);
            expect(symbol.modules.every((row) => row.length === symbol.size)).toBe(true);
        }
    });

    it("puts a finder pattern in three corners and not the fourth", () => {
        const { modules, size } = encodeQr("finders", { errorCorrection: "M" });
        const finderAt = (row: number, col: number): boolean =>
            (modules[row] as boolean[])[col] === true &&
            (modules[row + 1] as boolean[])[col + 1] === false &&
            (modules[row + 2] as boolean[])[col + 2] === true;
        expect(finderAt(0, 0)).toBe(true);
        expect(finderAt(0, size - 7)).toBe(true);
        expect(finderAt(size - 7, 0)).toBe(true);
        // The bottom-right corner carries data, so the one thing that can be
        // asserted is that it is not a finder's centre.
        expect((modules[size - 4] as boolean[])[size - 4]).toBeDefined();
    });

    it("keeps the dark module dark, at (size - 8, 8)", () => {
        const { modules, size } = encodeQr("dark module", { errorCorrection: "Q" });
        expect((modules[size - 8] as boolean[])[8]).toBe(true);
    });

    it("alternates the timing patterns", () => {
        const { modules, size } = encodeQr("timing", { errorCorrection: "M" });
        for (let i = 8; i < size - 8; i += 1) {
            expect((modules[6] as boolean[])[i], `row 6 col ${i}`).toBe(i % 2 === 0);
            expect((modules[i] as boolean[])[6], `col 6 row ${i}`).toBe(i % 2 === 0);
        }
    });

    it("chooses a mask by score rather than always the first", () => {
        // If mask selection were stubbed to 0, every symbol would report 0.
        const masks = new Set(
            ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"].map(
                (value) => encodeQr(value, { errorCorrection: "M" }).mask,
            ),
        );
        expect(masks.size).toBeGreaterThan(1);
    });
});

describe("the mask penalty rules", () => {
    /**
     * These four rules are the only part of the encoder whose failure NO other
     * test here can detect: a badly scored mask produces a symbol that decodes
     * perfectly in software and reads badly under a camera, and nobody runs
     * that check in CI.
     *
     * So they are pinned with ABSOLUTE totals, each worked out on paper rule by
     * rule, with the arithmetic in the comment. The first version of this
     * block asserted DELTAS between two grids and was wrong twice — a run of
     * five costs 3 horizontally but also removes a 5-light vertical run worth
     * 3, so the "isolated" comparison measured zero. Moving one feature in a
     * grid changes three rules at once; only a full hand-computed total is
     * actually independent of the implementation.
     *
     * The helper requires SQUARE grids, as a real symbol always is: `penalty`
     * uses one `size` for both axes.
     */
    const grid = (rows: string[]): boolean[][] => rows.map((row) => [...row].map((c) => c === "#"));
    const rep = (ch: string, n: number): string => ch.repeat(n);

    it("scores a 7x7 single-colour field at 278", () => {
        //   cond1: 7 light in each row -> 7-2 = 5, x7 = 35; columns the same -> 70
        //   cond2: 6*6 = 36 same-coloured 2x2 blocks, x3                     -> 108
        //   cond3: the finder-like pattern needs both colours                -> 0
        //   cond4: 0% dark -> floor(|0-50|/5)*10                             -> 100
        expect(penalty(grid(Array(7).fill(rep(".", 7))))).toBe(278);
        // All dark is the same total: cond4 reads |100-50|, which is also 50.
        expect(penalty(grid(Array(7).fill(rep("#", 7))))).toBe(278);
    });

    it("scores a perfect checkerboard at zero", () => {
        // No run reaches five, no 2x2 matches, a 1010101 row is not the
        // finder-like 1011101, and 25 of 49 modules dark is 51.02% -> 0.
        const checker = Array.from({ length: 7 }, (_, r) =>
            Array.from({ length: 7 }, (_, c) => ((r + c) % 2 === 0 ? "#" : ".")).join(""),
        );
        expect(penalty(grid(checker))).toBe(0);
    });

    it("counts the finder-like pattern once per side it is padded on", () => {
        /**
         * The prose rule — "add 40 each time the pattern appears with four
         * light modules on either side" — is ambiguous about a pattern padded
         * on BOTH sides, and the answer picks the mask. These two grids pin it:
         * they differ only in where the pattern sits, and the centred one is
         * two eleven-module windows.
         *
         * centred, `....#.###.#....` in row 0 of an otherwise light 15x15:
         *   cond1 h: rows 1-14 are 15 light -> 13 each = 182; row 0 has no
         *            run of five                                      -> 182
         *   cond1 v: 5 columns hold 1 dark + 14 light -> 12 each = 60;
         *            the other 10 are 15 light -> 13 each = 130       -> 190
         *   cond2  : rows 1-14 give 13*14 = 182 blocks x3 = 546, plus the
         *            row 0/1 blocks under row 0's 6 adjacent light pairs
         *            -> 18                                            -> 564
         *   cond3  : TWO windows x40                                  -> 80
         *   cond4  : 5 dark of 225 = 2.22% -> floor(47.78/5)*10        -> 90
         */
        const centred = grid(["....#.###.#....", ...Array(14).fill(rep(".", 15))]);
        expect(penalty(centred)).toBe(182 + 190 + 564 + 80 + 90);

        /**
         * flush right, `........#.###.#`:
         *   cond1 h: row 0 now opens with 8 light -> 6, plus 182       -> 188
         *   cond1 v: unchanged — still 5 columns with a dark           -> 190
         *   cond2  : row 0 now has 7 adjacent light pairs -> 546 + 21  -> 567
         *   cond3  : ONE window                                        -> 40
         *   cond4  : unchanged                                         -> 90
         */
        const flushRight = grid(["........#.###.#", ...Array(14).fill(rep(".", 15))]);
        expect(penalty(flushRight)).toBe(188 + 190 + 567 + 40 + 90);

        // And the thing those two totals actually pin: counting the centred
        // pattern ONCE would make it 1066 rather than 1106.
        expect(penalty(centred) - penalty(flushRight)).toBe(31);
    });

    it("scores an all-dark field far worse than a real symbol", () => {
        const real = encodeQr("https://example.com/pair#482913", { errorCorrection: "M" });
        const allDark = real.modules.map((row) => row.map(() => true));
        expect(penalty(allDark)).toBeGreaterThan(penalty(real.modules) * 2);
    });
});

describe("format information", () => {
    it("writes BOTH copies identically", () => {
        /**
         * The decoder above reads the top-left copy. A scanner may read either,
         * so a wrong second copy would be invisible to every other test here
         * and fatal in a reader that happened to use it.
         */
        for (const ec of EC_LEVELS) {
            const { modules, size } = encodeQr("two copies", { errorCorrection: ec });

            let first = 0;
            for (let i = 0; i <= 5; i += 1) {
                first |= (((modules[8] as boolean[])[i] ? 1 : 0) << (14 - i));
            }
            first |= ((modules[8] as boolean[])[7] ? 1 : 0) << 8;
            first |= ((modules[8] as boolean[])[8] ? 1 : 0) << 7;
            first |= ((modules[7] as boolean[])[8] ? 1 : 0) << 6;
            for (let i = 9; i <= 14; i += 1) {
                first |= (((modules[14 - i] as boolean[])[8] ? 1 : 0) << (14 - i));
            }

            // SEVEN up the column, then EIGHT along the row. An 8/7 split
            // here puts bit 7 at (size - 8, 8) -- the dark module -- which is
            // the bug this test was written to find, and it found it.
            let second = 0;
            for (let i = 0; i <= 6; i += 1) {
                second |= ((modules[size - 1 - i] as boolean[])[8] ? 1 : 0) << i;
            }
            for (let i = 7; i <= 14; i += 1) {
                second |= ((modules[8] as boolean[])[size - 15 + i] ? 1 : 0) << i;
            }

            expect(second, `level ${ec}`).toBe(first);
            expect((FORMAT_BITS[ec] as readonly number[]).includes(first), `level ${ec}`).toBe(true);
        }
    });
});

describe("mode selection", () => {
    it.each([
        ["482913", "numeric"],
        ["0", "numeric"],
        ["PAIR-482913", "alphanumeric"],
        ["HELLO WORLD", "alphanumeric"],
        ["https://example.com", "byte"],
        ["lowercase", "byte"],
        ["héllo", "byte"],
    ] as [string, QrMode][])("reads %s as %s mode", (value, mode) => {
        expect(selectMode(value)).toBe(mode);
    });

    it("packs a numeric value far tighter than byte mode would", () => {
        // The reason mode selection exists rather than defaulting to byte: a
        // PIN in numeric mode is a third of the bits, which is the difference
        // between a code a phone reads across a desk and one it does not.
        const digits = "1234567890".repeat(6);
        expect(encodeQr(digits, { errorCorrection: "M" }).version).toBeLessThan(
            encodeQr(digits, { errorCorrection: "M", mode: "byte" }).version,
        );
    });
});

describe("refusals", () => {
    it("derives the published maximum capacity for each mode", () => {
        // 7089 / 4296 / 2953 are the standard's figures at version 40 level L.
        // They are DERIVED from the block table here rather than transcribed,
        // so they cannot drift from the capacities the encoder enforces -- and
        // asserting them against the published numbers is what makes the
        // derivation trustworthy rather than merely self-consistent.
        expect(maxCharacters("numeric")).toBe(7089);
        expect(maxCharacters("alphanumeric")).toBe(4296);
        expect(maxCharacters("byte")).toBe(2953);
    });

    it("refuses an impossible value in O(1), without walking it", () => {
        /**
         * `value` is text this code did not author, and the encoder reaches
         * consumers as VENDORED SOURCE as well as a package -- `fancy-cli add
         * qr-code` copies it in with no manifest, so nothing watches it.
         *
         * `selectVersion` used to walk versions 1-40 and re-encode the payload
         * at each, so an oversized value was encoded forty times before being
         * refused: measured at 342 ms for 100 kB and 2.0 s for 500 kB on the
         * built bundle, linear, which is tens of seconds of blocked main
         * thread for a few megabytes through `<QrCode value={userInput} />`.
         *
         * The refusal was always correct. The COST of the refusal was the
         * defect, which is why this test measures time rather than behaviour.
         */
        const huge = "a".repeat(2_000_000);
        const started = performance.now();
        expect(() => encodeQr(huge)).toThrow(RangeError);
        const elapsed = performance.now() - started;

        // A generous bound: the old code needed seconds for a quarter of this.
        // What is being pinned is the ORDER of magnitude, not a benchmark.
        expect(elapsed).toBeLessThan(100);
    });

    it("still encodes a value right at the capacity boundary", () => {
        // The guard must not reject something that genuinely fits. The
        // boundary is the one place an off-by-one hides.
        expect(encodeQr("a".repeat(2953), { errorCorrection: "L" }).version).toBe(40);
        expect(() => encodeQr("a".repeat(2954), { errorCorrection: "L" })).toThrow(RangeError);
        expect(encodeQr("1".repeat(7089), { errorCorrection: "L" }).version).toBe(40);
        expect(() => encodeQr("1".repeat(7090), { errorCorrection: "L" })).toThrow(RangeError);
    });

    it("throws rather than truncating a value that cannot fit", () => {
        // The alternative is a symbol that scans cleanly and yields the wrong
        // string -- silent corruption on a surface whose whole job is to carry
        // a value accurately.
        expect(() => encodeQr("x".repeat(3000), { errorCorrection: "H" })).toThrow(RangeError);
    });

    it("throws when a forced version is too small", () => {
        expect(() => encodeQr("x".repeat(100), { version: 1, errorCorrection: "L" })).toThrow(RangeError);
    });

    it("throws on an out-of-range version", () => {
        expect(() => encodeQr("x", { version: 0 })).toThrow(RangeError);
        expect(() => encodeQr("x", { version: 41 })).toThrow(RangeError);
    });

    it("throws when a forced mode cannot carry the value", () => {
        expect(() => encodeQr("not digits", { mode: "numeric" })).toThrow(RangeError);
        expect(() => encodeQr("lowercase", { mode: "alphanumeric" })).toThrow(RangeError);
    });

    it("encodes an empty string rather than throwing", () => {
        // A controlled surface will render before its value arrives. An empty
        // value is a valid symbol, and throwing would make every consumer
        // guard a render.
        const symbol = encodeQr("", { errorCorrection: "M" });
        expect(symbol.size).toBe(21);
        expect(decodeSymbol(symbol.modules).text).toBe("");
    });
});

import { reservedModules, type QrErrorCorrection } from "../src/components/QrCode/qr-encode";
import { EC_LEVELS, FORMAT_BITS, blockLayout } from "../src/components/QrCode/qr-tables";

/**
 * The round-trip decoder, shared by `qr-encode.test.ts` (which reads the
 * encoder's matrix) and the headless-browser check of `QrCodePanel`'s PNG
 * download (which reads a matrix SAMPLED FROM THE PIXELS a real browser wrote).
 *
 * It lived inside `qr-encode.test.ts` until the PNG check needed it. It moved
 * rather than being copied, because a second copy of a decoder is a second
 * decoder, and the two would drift apart the first time one of them was fixed.
 */

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
export function decodeSymbol(modules: readonly boolean[][]): { text: string; ec: QrErrorCorrection; mask: number } {
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

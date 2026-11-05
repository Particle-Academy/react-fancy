// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QrCode } from "../src/components/QrCode";
import { encodeQr } from "../src/components/QrCode/qr-encode";
import { modulePath } from "../src/components/QrCode/qr-path";
import { pngScale, qrCodePng, qrCodeSvg, safeFileName } from "../src/components/QrCode/qr-export";
import { decodeSymbol } from "./qr-decode-helper";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The files `QrCodePanel` hands a person: a standalone SVG and a PNG.
 *
 * The failure worth designing against is a file that differs from the code on
 * screen. So the SVG is checked against the path `<QrCode>` actually renders,
 * and the PNG against the same path data, drawn at a whole number of pixels
 * per module. jsdom has no canvas, so the PNG half here pins the DRAWING
 * CALLS; the pixels themselves are checked in a real headless browser, which
 * downloads the PNG and decodes it back to the value.
 */

const roots: Root[] = [];
afterEach(() => {
    for (const root of roots.splice(0)) {
        act(() => root.unmount());
    }
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

function renderedPath(value: string): string {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    roots.push(root);
    act(() => root.render(<QrCode value={value} label="x" />));
    return host.querySelector("path")?.getAttribute("d") ?? "";
}

function parseSvg(markup: string): Document {
    return new DOMParser().parseFromString(markup, "image/svg+xml");
}

describe("modulePath", () => {
    it("is exactly the path <QrCode> renders", () => {
        for (const value of ["SN-4829-13", "https://example.com/r/AbC123", "482913", ""]) {
            const symbol = encodeQr(value);
            expect(modulePath(symbol.modules, 4)).toBe(renderedPath(value));
        }
    });
});

describe("qrCodeSvg", () => {
    const value = "https://example.com/r/AbC123";

    it("is a well-formed standalone SVG document", () => {
        const markup = qrCodeSvg(value, { label: "Join with this link" });
        expect(markup.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
        const doc = parseSvg(markup);
        expect(doc.querySelector("parsererror")).toBeNull();
        const svg = doc.documentElement;
        expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    });

    it("carries a text alternative: a <title> and an accessible name", () => {
        const svg = parseSvg(qrCodeSvg(value, { label: "Join with this link" })).documentElement;
        expect(svg.getAttribute("role")).toBe("img");
        expect(svg.getAttribute("aria-label")).toBe("Join with this link");
        expect(svg.querySelector("title")?.textContent).toBe("Join with this link");
    });

    it("draws the same modules as the code on screen", () => {
        const svg = parseSvg(qrCodeSvg(value, { label: "x" })).documentElement;
        expect(svg.querySelector("path")?.getAttribute("d")).toBe(renderedPath(value));
        const extent = encodeQr(value).size + 8;
        expect(svg.getAttribute("viewBox")).toBe(`0 0 ${extent} ${extent}`);
    });

    it("decodes back to the value", () => {
        // The SVG's own path, read back into a matrix and through the decoder.
        const svg = parseSvg(qrCodeSvg(value, { label: "x" })).documentElement;
        const d = svg.querySelector("path")?.getAttribute("d") ?? "";
        const size = encodeQr(value).size;
        const grid = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
        for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
            const col = Number(m[1]) - 4;
            const row = Number(m[2]) - 4;
            for (let i = 0; i < Number(m[3]); i += 1) {
                (grid[row] as boolean[])[col + i] = true;
            }
        }
        expect(decodeSymbol(grid).text).toBe(value);
    });

    it("is always opaque: a file has no surface behind it to inherit", () => {
        const plain = parseSvg(qrCodeSvg(value, { label: "x" })).documentElement;
        expect(plain.querySelector("rect")?.getAttribute("fill")).toBe("#ffffff");
        expect(plain.querySelector("path")?.getAttribute("fill")).toBe("#000000");

        const inherited = parseSvg(
            qrCodeSvg(value, { label: "x", background: "transparent", foreground: "currentColor" }),
        ).documentElement;
        expect(inherited.querySelector("rect")?.getAttribute("fill")).toBe("#ffffff");
        expect(inherited.querySelector("path")?.getAttribute("fill")).toBe("#000000");

        const custom = parseSvg(
            qrCodeSvg(value, { label: "x", background: "#fffbe6", foreground: "#1a1a2e" }),
        ).documentElement;
        expect(custom.querySelector("rect")?.getAttribute("fill")).toBe("#fffbe6");
        expect(custom.querySelector("path")?.getAttribute("fill")).toBe("#1a1a2e");
    });

    it("covers the quiet zone with the background", () => {
        const svg = parseSvg(qrCodeSvg(value, { label: "x", quietZone: 6 })).documentElement;
        const extent = encodeQr(value).size + 12;
        expect(svg.querySelector("rect")?.getAttribute("width")).toBe(String(extent));
        expect(svg.querySelector("rect")?.getAttribute("height")).toBe(String(extent));
    });

    it("escapes the label and colours rather than letting them into the markup", () => {
        const hostile = '</title><script>alert(1)</script><title a="';
        const markup = qrCodeSvg(value, { label: hostile, foreground: '"/><script>x</script>' });
        const doc = parseSvg(markup);
        expect(doc.querySelector("parsererror")).toBeNull();
        expect(doc.querySelector("script")).toBeNull();
        expect(doc.querySelector("title")?.textContent).toBe(hostile);
    });

    it("drops what XML cannot carry, so a hostile label still gives a valid file", () => {
        // C0 controls other than tab, newline and return are not allowed in
        // XML 1.0 even as references; a lone surrogate is not text at all.
        const label = `a${String.fromCharCode(1)}b${String.fromCharCode(0x1f)}c\td${String.fromCharCode(0xd800)}`;
        const doc = parseSvg(qrCodeSvg(value, { label }));
        expect(doc.querySelector("parsererror")).toBeNull();
        expect(doc.querySelector("title")?.textContent).toBe(`abc\td${String.fromCharCode(0xfffd)}`);
    });

    it("sizes in pixels, defaulting to ten per module", () => {
        const extent = encodeQr(value).size + 8;
        const svg = parseSvg(qrCodeSvg(value, { label: "x" })).documentElement;
        expect(svg.getAttribute("width")).toBe(String(extent * 10));
        const sized = parseSvg(qrCodeSvg(value, { label: "x", size: 300 })).documentElement;
        expect(sized.getAttribute("width")).toBe("300");
        expect(sized.getAttribute("height")).toBe("300");
    });

    it("refuses an impossible value as the encoder does, without walking it", () => {
        const huge = "a".repeat(5_000_000);
        const started = performance.now();
        expect(() => qrCodeSvg(huge, { label: "x" })).toThrow(RangeError);
        expect(performance.now() - started).toBeLessThan(100);
    });
});

/** A canvas that records what was drawn on it, in order. */
function recordingCanvas(blob: Blob | null = new Blob(["png"], { type: "image/png" })) {
    const calls: string[] = [];
    const ctx = {
        _fill: "#000000",
        imageSmoothingEnabled: true,
        set fillStyle(v: string) {
            // A real canvas ignores a colour it cannot parse; so does this one.
            if (v.startsWith("#") || v === "red") {
                this._fill = v;
            }
            calls.push(`fillStyle=${v}`);
        },
        get fillStyle() {
            return this._fill;
        },
        fillRect: (x: number, y: number, w: number, h: number) => {
            calls.push(`fillRect ${x} ${y} ${w} ${h} with ${ctx._fill}`);
        },
        setTransform: (a: number, _b: number, _c: number, d: number) => {
            calls.push(`setTransform ${a} ${d}`);
        },
        fill: (path: { d: string }) => {
            calls.push(`fill path(${path.d.length}) with ${ctx._fill}`);
        },
    };
    const canvas = {
        width: 0,
        height: 0,
        getContext: (kind: string) => (kind === "2d" ? ctx : null),
        toBlob: (cb: (b: Blob | null) => void, type: string) => {
            calls.push(`toBlob ${type}`);
            cb(blob);
        },
    };
    return { canvas: canvas as unknown as HTMLCanvasElement, calls, ctx };
}

class FakePath2D {
    constructor(public d: string) {}
}

describe("qrCodePng", () => {
    const value = "https://example.com/r/AbC123";

    it("paints the background over the WHOLE canvas before any module", async () => {
        vi.stubGlobal("Path2D", FakePath2D);
        const { canvas, calls, ctx } = recordingCanvas();
        const blob = await qrCodePng(value, { label: "x", canvas });
        const extent = encodeQr(value).size + 8;

        expect(blob.type).toBe("image/png");
        expect(canvas.width).toBe(extent * 10);
        expect(canvas.height).toBe(extent * 10);
        expect(ctx.imageSmoothingEnabled).toBe(false);

        const background = calls.findIndex((c) => c.startsWith("fillRect 0 0"));
        const modules = calls.findIndex((c) => c.startsWith("fill path"));
        expect(calls[background]).toBe(`fillRect 0 0 ${extent * 10} ${extent * 10} with #ffffff`);
        expect(background).toBeLessThan(modules);
        expect(calls[modules]).toBe(`fill path(${modulePath(encodeQr(value).modules, 4).length}) with #000000`);
        expect(calls).toContain("setTransform 10 10");
        vi.unstubAllGlobals();
    });

    it("falls back to white and black when a colour cannot be parsed", async () => {
        vi.stubGlobal("Path2D", FakePath2D);
        const { canvas, calls } = recordingCanvas();
        await qrCodePng(value, { label: "x", canvas, background: "not-a-colour", foreground: "currentColor" });
        expect(calls.find((c) => c.startsWith("fillRect 0 0"))).toMatch(/with #ffffff$/);
        expect(calls.find((c) => c.startsWith("fill path"))).toMatch(/with #000000$/);
        vi.unstubAllGlobals();
    });

    it("rejects rather than resolving an empty file when the browser gives no blob", async () => {
        vi.stubGlobal("Path2D", FakePath2D);
        const { canvas } = recordingCanvas(null);
        await expect(qrCodePng(value, { label: "x", canvas })).rejects.toThrow(/PNG/);
        vi.unstubAllGlobals();
    });
});

describe("pngScale", () => {
    it("is a whole number of pixels per module, so no module edge is blurred", () => {
        expect(pngScale(10, 41)).toBe(10);
        expect(pngScale(7.6, 41)).toBe(7);
        expect(pngScale(undefined, 41)).toBe(10);
    });

    it("is at least one and never draws past 8192 pixels a side", () => {
        expect(pngScale(0, 41)).toBe(1);
        expect(pngScale(-5, 41)).toBe(1);
        expect(pngScale(Number.NaN, 41)).toBe(10);
        expect(pngScale(1_000_000, 185)).toBe(Math.floor(8192 / 185));
    });
});

describe("safeFileName", () => {
    it("keeps a plain name and drops anything a file system could misread", () => {
        expect(safeFileName("ambassador-link", "qr-code")).toBe("ambassador-link");
        expect(safeFileName("../../etc/passwd", "qr-code")).toBe("etc-passwd");
        expect(safeFileName("my code.v2", "qr-code")).toBe("my-code.v2");
        expect(safeFileName("", "qr-code")).toBe("qr-code");
        expect(safeFileName("...", "qr-code")).toBe("qr-code");
    });

    it("is linear on a hostile name", () => {
        const hostile = `${"a!".repeat(200_000)}`;
        const started = performance.now();
        const out = safeFileName(hostile, "qr-code");
        expect(performance.now() - started).toBeLessThan(200);
        expect(out.length).toBeLessThanOrEqual(100);
    });
});

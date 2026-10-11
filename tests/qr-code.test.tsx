// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QrCode } from "../src/components/QrCode";
import { encodeQr } from "../src/components/QrCode/qr-encode";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `QrCode` renders a symbol as ONE SVG path on a module-unit viewBox.
 *
 * The encoder's own correctness is pinned in `qr-encode.test.ts` against the
 * standard's published worked example. This file covers the part a consumer
 * touches: that the drawing actually corresponds to the symbol, that the quiet
 * zone is there, and that the accessibility and colour contracts hold.
 *
 * ## The two failures worth designing against
 *
 * Both produce a code that LOOKS perfect and does not scan, so neither is
 * visible in a screenshot review:
 *
 * - **No quiet zone.** It is not padding; it is how a scanner finds the
 *   symbol's edge. A code flush against surrounding content is the most common
 *   cause of "the QR code doesn't work".
 * - **A transparent background on a dark surface.** The default inherits
 *   whatever is behind it, so the symbol renders dark-on-dark. Contrast is
 *   what gets scanned, not the dark modules alone.
 */

const roots: Root[] = [];

function mount(el: ReactElement): HTMLElement {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    roots.push(root);
    act(() => {
        root.render(el);
    });
    return host;
}

afterEach(() => {
    for (const root of roots.splice(0)) {
        act(() => {
            root.unmount();
        });
    }
    document.body.innerHTML = "";
});

const svgOf = (host: HTMLElement): SVGSVGElement => host.querySelector("svg") as SVGSVGElement;

describe("QrCode", () => {
    it("renders one svg with one path, not a rect per module", () => {
        // A version 10 symbol is 57x57 -- over three thousand modules. A rect
        // each would be three thousand DOM nodes for something that never
        // changes after render.
        const host = mount(<QrCode value={"x".repeat(200)} label="A long value" />);
        expect(host.querySelectorAll("svg")).toHaveLength(1);
        expect(host.querySelectorAll("path")).toHaveLength(1);
        expect(host.querySelectorAll("rect")).toHaveLength(0);
    });

    it("sizes the viewBox in MODULES, so size scales without resampling", () => {
        // A raster code scaled to a non-integer multiple of its module size
        // has blurred module edges, and a scanner reading a blurred edge
        // guesses. A module-unit viewBox cannot have that problem.
        const symbol = encodeQr("viewBox", { errorCorrection: "M" });
        const host = mount(<QrCode value="viewBox" label="Scaling" size={333} />);
        const svg = svgOf(host);
        const extent = symbol.size + 8; // default quiet zone of 4 each side
        expect(svg.getAttribute("viewBox")).toBe(`0 0 ${extent} ${extent}`);
        expect(svg.getAttribute("width")).toBe("333");
        expect(svg.getAttribute("height")).toBe("333");
    });

    it("leaves a four-module quiet zone by default", () => {
        const symbol = encodeQr("quiet", { errorCorrection: "M" });
        const host = mount(<QrCode value="quiet" label="Quiet zone" />);
        const d = svgOf(host).querySelector("path")?.getAttribute("d") ?? "";

        // Every drawn rectangle must start at or past module 4 on both axes,
        // and end at or before `size + 4`.
        const coords = [...d.matchAll(/M(\d+) (\d+)h(\d+)/g)].map((m) => ({
            x: Number(m[1]),
            y: Number(m[2]),
            run: Number(m[3]),
        }));
        expect(coords.length).toBeGreaterThan(0);
        expect(Math.min(...coords.map((c) => c.x))).toBeGreaterThanOrEqual(4);
        expect(Math.min(...coords.map((c) => c.y))).toBeGreaterThanOrEqual(4);
        expect(Math.max(...coords.map((c) => c.x + c.run))).toBeLessThanOrEqual(symbol.size + 4);
        expect(Math.max(...coords.map((c) => c.y))).toBeLessThanOrEqual(symbol.size + 3);
    });

    it("honours a custom quiet zone, including zero", () => {
        const symbol = encodeQr("zero", { errorCorrection: "M" });
        const host = mount(<QrCode value="zero" label="No quiet zone" quietZone={0} />);
        expect(svgOf(host).getAttribute("viewBox")).toBe(`0 0 ${symbol.size} ${symbol.size}`);
        // Allowed, and documented as a mistake. The component does not refuse
        // it: a consumer compositing their own margin has a legitimate reason,
        // and a prop that silently ignores its value is worse than one that
        // does what it is told.
    });

    it("draws exactly the modules the encoder produced", () => {
        /**
         * The assertion that makes the rest meaningful. The path is
         * reconstructed back into a module grid and compared with the
         * encoder's output cell by cell — so a transposed row, an off-by-one
         * in the run-length packing, or a dropped last column is caught here
         * rather than by a human squinting at a screenshot.
         */
        const value = "https://alphar.tail1234.ts.net:7421/pair#482913";
        const symbol = encodeQr(value, { errorCorrection: "M" });
        const host = mount(<QrCode value={value} label="Pair this device" quietZone={0} />);
        const d = svgOf(host).querySelector("path")?.getAttribute("d") ?? "";

        const drawn = Array.from({ length: symbol.size }, () =>
            new Array<boolean>(symbol.size).fill(false),
        );
        for (const match of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
            const x = Number(match[1]);
            const y = Number(match[2]);
            const run = Number(match[3]);
            for (let i = 0; i < run; i += 1) {
                (drawn[y] as boolean[])[x + i] = true;
            }
        }
        expect(drawn).toEqual(symbol.modules);
    });

    it("run-length packs horizontal runs rather than emitting one square each", () => {
        const value = "run length packing";
        const symbol = encodeQr(value, { errorCorrection: "M" });
        const host = mount(<QrCode value={value} label="Packing" />);
        const d = svgOf(host).querySelector("path")?.getAttribute("d") ?? "";
        const subpaths = [...d.matchAll(/M/g)].length;
        const darkModules = symbol.modules.flat().filter(Boolean).length;
        expect(darkModules).toBeGreaterThan(0);
        expect(subpaths).toBeLessThan(darkModules);
    });

    it("names the destination for a screen reader, since the image is unusable to one", () => {
        const host = mount(<QrCode value="https://example.com" label="Pair this device" />);
        const svg = svgOf(host);
        expect(svg.getAttribute("role")).toBe("img");
        expect(svg.getAttribute("aria-label")).toBe("Pair this device");
    });

    it("inherits text colour by default and takes explicit colours", () => {
        const plain = mount(<QrCode value="colour" label="Default colour" />);
        expect(svgOf(plain).querySelector("path")?.getAttribute("fill")).toBe("currentColor");
        // Transparent by default means NO background rect at all, so the
        // symbol inherits whatever is behind it -- fine on a light surface and
        // unscannable on a dark one.
        expect(svgOf(plain).querySelector("rect")).toBeNull();

        const explicit = mount(
            <QrCode value="colour" label="Explicit" foreground="#0b0b0c" background="#ffffff" />,
        );
        expect(svgOf(explicit).querySelector("path")?.getAttribute("fill")).toBe("#0b0b0c");
        expect(svgOf(explicit).querySelector("rect")?.getAttribute("fill")).toBe("#ffffff");
    });

    it("covers the whole viewBox with the background, quiet zone included", () => {
        // A background that stopped at the symbol would leave the quiet zone
        // showing the surface behind it -- which defeats the quiet zone on any
        // surface that is not already light.
        const symbol = encodeQr("background", { errorCorrection: "M" });
        const host = mount(<QrCode value="background" label="Background" background="#fff" />);
        const rect = svgOf(host).querySelector("rect");
        expect(rect?.getAttribute("width")).toBe(String(symbol.size + 8));
        expect(rect?.getAttribute("height")).toBe(String(symbol.size + 8));
    });

    it("carries the class and passes the rest through", () => {
        const host = mount(
            <QrCode value="x" label="Rest props" className="my-code" data-testid="pairing-qr" />,
        );
        const svg = svgOf(host);
        expect(svg.classList.contains("fa-qr-code")).toBe(true);
        expect(svg.classList.contains("my-code")).toBe(true);
        expect(svg.getAttribute("data-testid")).toBe("pairing-qr");
    });

    it("grows the symbol for a higher error correction level", () => {
        const value = "y".repeat(120);
        const low = encodeQr(value, { errorCorrection: "L" });
        const high = encodeQr(value, { errorCorrection: "H" });
        expect(high.size).toBeGreaterThan(low.size);
        // Which is why H is not a free upgrade: the same pixel width now holds
        // more, smaller modules, and on a phone screen that can read worse.
    });

    it("renders an empty value rather than throwing", () => {
        // A controlled surface renders before its value arrives.
        const host = mount(<QrCode value="" label="Nothing yet" />);
        expect(svgOf(host).getAttribute("viewBox")).toBe("0 0 29 29");
    });

    it("renders a six-digit PIN compactly, via numeric mode", () => {
        // The pairing case: numeric mode packs three digits into ten bits, so
        // a PIN is a version 1 symbol -- the largest modules, the easiest read.
        const host = mount(<QrCode value="482913" label="Pairing PIN" />);
        expect(svgOf(host).getAttribute("viewBox")).toBe("0 0 29 29");
    });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Input } from "../src/components/inputs/Input";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

function mount(el: ReactElement): HTMLElement {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    roots.push(root);
    act(() => root.render(el));

    return host;
}

afterEach(() => {
    roots.splice(0).forEach((r) => act(() => r.unmount()));
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

/**
 * A wide `leading` must not render on top of the value.
 *
 * `leading`/`trailing` are absolutely positioned over the input, so they take
 * no space in flow and the input is padded by hand to keep text clear of them.
 * That padding was a fixed `pl-9` — 36px, sized for a single icon — while the
 * adornment sits at `left-3` (12px), leaving 24px of room.
 *
 * `leading="https://"` is roughly 50px. So `https://` and the value rendered on
 * top of one another, which is what a consumer saw on the live showcase.
 *
 * jsdom performs no layout, so `getBoundingClientRect()` is stubbed: the point
 * under test is that the component RESERVES whatever it measured, not what the
 * browser's font metrics happen to be.
 */
function stubWidth(px: number) {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        width: px, height: 20, top: 0, left: 0, right: px, bottom: 20, x: 0, y: 0,
        toJSON: () => ({}),
    } as DOMRect);
}

describe("an input reserves space for the width it actually measured", () => {
    beforeEach(() => {
        // ResizeObserver does not exist in jsdom; the hook must survive that.
        (globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined;
    });

    it("pads by the measured leading width, not a fixed 36px", () => {
        stubWidth(52);
        const host = mount(<Input label="Domain" leading="https://" defaultValue="fancy.app" />);
        const input = host.querySelector("input")!;

        // 52 measured + 12 to clear left-3 + 8 gap
        expect(input.style.paddingLeft).toBe("72px");

        // ...and the fixed fallback is gone once a real width is known, or the
        // two would fight and the narrower would win.
        expect(input.className).not.toContain("pl-9");
    });

    it("pads by the measured trailing width too", () => {
        stubWidth(34);
        const host = mount(<Input label="Amount" trailing="USD" defaultValue="42" />);
        const input = host.querySelector("input")!;

        expect(input.style.paddingRight).toBe("54px");
        expect(input.className).not.toContain("pr-9");
    });

    it("keeps the fixed fallback while the width is still unknown", () => {
        // width 0 = not measured yet, or server-rendered. Falling back to the
        // old fixed padding is strictly better than rendering unpadded.
        stubWidth(0);
        const host = mount(<Input label="Domain" leading="https://" />);
        const input = host.querySelector("input")!;

        expect(input.className).toContain("pl-9");
        expect(input.style.paddingLeft).toBe("");
    });

    it("adds no padding at all when there is no adornment", () => {
        stubWidth(52);
        const host = mount(<Input label="Plain" defaultValue="x" />);
        const input = host.querySelector("input")!;

        expect(input.style.paddingLeft).toBe("");
        expect(input.style.paddingRight).toBe("");
        expect(input.className).not.toContain("pl-9");
    });
});

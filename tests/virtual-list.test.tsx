// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VirtualList } from "../src/components/VirtualList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `VirtualList` is an event ledger that runs to tens of thousands of rows.
 *
 * Built for Genie 2's Agent view Stream, where the list is both very long and
 * mixed-height — message rows wrap, event rows never do — and where the reading
 * position is sacred: nothing may ever scroll under the reader.
 *
 * ## Why every measurement here is stubbed
 *
 * jsdom performs no layout, so `getBoundingClientRect()` returns zeros and
 * `clientHeight` is always 0. That is not an obstacle to testing this component
 * — it is the only honest way to test it. The property under test is never
 * "what height did the browser compute", it is **"given the heights it
 * measured, does it put the right rows in the right places"**. Stubbing the
 * geometry makes that the only variable.
 *
 * Rows are given heights by id: anything starting with `tall-` measures 100px,
 * everything else 20px. A real wrapped message row and a real single-line event
 * row differ in exactly this way.
 */

const ROW_TALL = 100;
const ROW_SHORT = 20;
const VIEWPORT = 200;

const roots: Root[] = [];

function heightForId(id: string): number {
    return id.startsWith("tall-") ? ROW_TALL : ROW_SHORT;
}

/**
 * Stub layout for the whole document: a row reports the height its id implies,
 * anything else reports zero. Applied to the prototype because the rows are
 * created and destroyed by the component as it scrolls.
 */
function stubLayout() {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
        this: HTMLElement,
    ) {
        const rowId = this.getAttribute("data-react-fancy-virtual-row-id");
        const height = rowId === null ? 0 : heightForId(rowId);

        return {
            width: 400, height, top: 0, left: 0, right: 400, bottom: height,
            x: 0, y: 0, toJSON: () => ({}),
        } as DOMRect;
    });
}

/** Give the viewport a real height; jsdom reports 0 for every element. */
function stubViewportHeight(viewport: HTMLElement, px: number) {
    Object.defineProperty(viewport, "clientHeight", { value: px, configurable: true });
}

function mount(el: ReactElement): HTMLElement {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    roots.push(root);
    act(() => root.render(el));

    return host;
}

function rerender(el: ReactElement) {
    const root = roots[roots.length - 1];
    act(() => root.render(el));
}

function viewportOf(host: HTMLElement): HTMLElement {
    return host.querySelector<HTMLElement>("[data-react-fancy-virtual-list]")!;
}

function renderedIds(host: HTMLElement): string[] {
    return Array.from(host.querySelectorAll("[data-react-fancy-virtual-row-id]")).map(
        (el) => el.getAttribute("data-react-fancy-virtual-row-id")!,
    );
}

/** Scroll the way a human does, so the component sees the event it listens for. */
function scrollTo(viewport: HTMLElement, top: number) {
    viewport.scrollTop = top;
    act(() => {
        viewport.dispatchEvent(new Event("scroll"));
    });
}

/**
 * Where a rendered row's top sits in the list's own coordinate space: the
 * window's translateY plus the measured heights of the rendered rows above it.
 * It equals `scrollTop` exactly when that row is at the top of the viewport,
 * which is what "landed on the row" actually means.
 */
function topOfRow(host: HTMLElement, id: string): number {
    const win = host.querySelector<HTMLElement>("[data-react-fancy-virtual-list-window]")!;
    const match = /translateY\(([-\d.]+)px\)/.exec(win.style.transform);
    let y = parseFloat(match?.[1] ?? "0");

    for (const el of Array.from(win.children) as HTMLElement[]) {
        const rowId = el.getAttribute("data-react-fancy-virtual-row-id")!;
        if (rowId === id) return y;
        y += heightForId(rowId);
    }

    throw new Error(`row ${id} is not rendered, so it cannot be at the top`);
}

type Row = { id: string; text: string };

function rows(count: number, prefix = "r"): Row[] {
    return Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, text: `row ${i}` }));
}

const renderRow = (item: Row) => <span>{item.text}</span>;

beforeEach(() => {
    stubLayout();
    // ResizeObserver does not exist in jsdom. The component must still measure
    // on mount and must not crash without it — a consumer on an older runtime
    // gets a working list, just one that does not re-measure on reflow.
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined;
});

afterEach(() => {
    roots.splice(0).forEach((r) => act(() => r.unmount()));
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

describe("windowing", () => {
    it("renders a window, not ten thousand rows", () => {
        const host = mount(
            <VirtualList items={rows(10_000)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} />,
        );

        const count = renderedIds(host).length;

        // 200px viewport / 20px rows = 10 visible, plus overscan both ways.
        // The exact number is an implementation detail; the ORDER OF MAGNITUDE
        // is the whole point of the component, so that is what is asserted.
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThan(100);
    });

    it("sizes the scrollable area for every row, not just the rendered ones", () => {
        const host = mount(
            <VirtualList items={rows(1_000)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} />,
        );

        const sizer = host.querySelector<HTMLElement>("[data-react-fancy-virtual-list-sizer]")!;

        // Unmeasured rows fall back to the estimate, so the scrollbar is right
        // from the first paint instead of growing as the user scrolls.
        expect(parseFloat(sizer.style.height)).toBeCloseTo(1_000 * ROW_SHORT, 0);
    });

    it("renders the rows the scroll position actually reaches", () => {
        const host = mount(
            <VirtualList items={rows(1_000)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} />,
        );
        const viewport = viewportOf(host);
        stubViewportHeight(viewport, VIEWPORT);

        scrollTo(viewport, 100 * ROW_SHORT);

        const ids = renderedIds(host);
        expect(ids).toContain("r-100");
        expect(ids).not.toContain("r-0");
    });
});

describe("variable row height", () => {
    it("offsets later rows by what the tall rows actually measured", () => {
        // One tall row among short ones. If heights were assumed uniform, every
        // row after it would be drawn 80px too high — the classic virtual-list
        // drift, and the reason an estimate alone is not enough.
        const items: Row[] = [
            { id: "r-0", text: "short" },
            { id: "tall-1", text: "a wrapped message" },
            { id: "r-2", text: "short" },
        ];

        const host = mount(
            <VirtualList items={items} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} />,
        );
        const sizer = host.querySelector<HTMLElement>("[data-react-fancy-virtual-list-sizer]")!;

        // 20 + 100 + 20, measured — not 3 * 20 estimated.
        expect(parseFloat(sizer.style.height)).toBeCloseTo(ROW_SHORT + ROW_TALL + ROW_SHORT, 0);
    });

    it("corrects the total as rows are measured, without being told their heights", () => {
        const items = [...rows(3), { id: "tall-3", text: "wrapped" }];

        const host = mount(
            <VirtualList items={items} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} />,
        );
        const sizer = host.querySelector<HTMLElement>("[data-react-fancy-virtual-list-sizer]")!;

        // No `rowHeight` callback was passed. The component learned the one
        // tall row by measuring it.
        expect(parseFloat(sizer.style.height)).toBeCloseTo(3 * ROW_SHORT + ROW_TALL, 0);
    });
});

describe("scrollToId", () => {
    it("lands on the row the id names", () => {
        const host = mount(
            <VirtualList
                items={rows(1_000)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                scrollToId="r-500"
            />,
        );
        const viewport = viewportOf(host);

        // `?at=r-500` in the URL must put row 500 at the top of the viewport.
        expect(viewport.scrollTop).toBeCloseTo(500 * ROW_SHORT, 0);
        expect(renderedIds(host)).toContain("r-500");
    });

    it("reports that it landed", () => {
        const onResolved = vi.fn();

        mount(
            <VirtualList
                items={rows(100)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                scrollToId="r-40"
                onScrollToIdResolved={onResolved}
            />,
        );

        expect(onResolved).toHaveBeenCalledWith("r-40", true);
    });

    it("says so when the id is not in the list, instead of scrolling somewhere arbitrary", () => {
        const onResolved = vi.fn();

        const host = mount(
            <VirtualList
                items={rows(100)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                scrollToId="r-does-not-exist"
                onScrollToIdResolved={onResolved}
            />,
        );

        // A deep link to a pruned row must not silently land on row 0 and look
        // like it worked. Position is untouched and the caller is told.
        expect(viewportOf(host).scrollTop).toBe(0);
        expect(onResolved).toHaveBeenCalledWith("r-does-not-exist", false);
    });

    it("re-anchors after the rows above the target are measured", () => {
        // The drift case. The rows above the target are tall, so the offset
        // computed from the ESTIMATE alone is far too small; once they are
        // measured the target has moved down and the component must settle onto
        // it rather than leaving the reader at a stale offset that merely
        // looked plausible.
        //
        // The assertion is the INVARIANT, not a magic number, and deliberately
        // so: rows above the rendered window are never measured, so they keep
        // their estimate and the absolute total stays approximate forever. What
        // must be exact is the LANDING — the target row's top is the scroll
        // position. Asserting a hand-computed offset here would be asserting
        // something the component should not promise.
        const items = [...rows(5, "tall"), ...rows(100)];

        const host = mount(
            <VirtualList
                items={items}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                scrollToId="r-2"
            />,
        );
        const viewport = viewportOf(host);

        // Corrected well past the 7 * 20 = 140 that the estimate alone predicts.
        expect(viewport.scrollTop).toBeGreaterThan(7 * ROW_SHORT);
        expect(topOfRow(host, "r-2")).toBeCloseTo(viewport.scrollTop, 0);
    });
});

describe("tail-follow", () => {
    it("pins to the bottom as rows arrive", () => {
        const host = mount(
            <VirtualList items={rows(50)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} followTail />,
        );
        const viewport = viewportOf(host);
        stubViewportHeight(viewport, VIEWPORT);

        rerender(
            <VirtualList items={rows(60)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} followTail />,
        );

        // 60 rows * 20px = 1200 total, 200px visible -> bottom is 1000.
        expect(viewport.scrollTop).toBeCloseTo(60 * ROW_SHORT - VIEWPORT, 0);
    });

    it("stops following the instant the human scrolls up, and says so", () => {
        const onFollowChange = vi.fn();
        const host = mount(
            <VirtualList
                items={rows(50)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail
                onFollowChange={onFollowChange}
            />,
        );
        const viewport = viewportOf(host);
        stubViewportHeight(viewport, VIEWPORT);

        act(() => {
            viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: -120, bubbles: true }));
        });

        expect(onFollowChange).toHaveBeenCalledWith(false);
    });

    it("stops following on an upward wheel even while still pinned to the bottom", () => {
        // The intent test, not the position test. A wheel-up at the very bottom
        // has not moved scrollTop yet, so a component watching only position
        // would keep following and would yank the reader back down on the next
        // append. "Nothing may ever scroll under the reader" is about intent.
        const onFollowChange = vi.fn();
        const host = mount(
            <VirtualList
                items={rows(50)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail
                onFollowChange={onFollowChange}
            />,
        );
        const viewport = viewportOf(host);
        stubViewportHeight(viewport, VIEWPORT);
        const pinned = viewport.scrollTop;

        act(() => {
            viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: -40, bubbles: true }));
        });

        expect(viewport.scrollTop).toBe(pinned);
        expect(onFollowChange).toHaveBeenCalledWith(false);
    });

    it("keeps following on a downward wheel", () => {
        const onFollowChange = vi.fn();
        const host = mount(
            <VirtualList
                items={rows(50)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail
                onFollowChange={onFollowChange}
            />,
        );
        const viewport = viewportOf(host);
        stubViewportHeight(viewport, VIEWPORT);

        act(() => {
            viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, bubbles: true }));
        });

        expect(onFollowChange).not.toHaveBeenCalledWith(false);
    });

    it("stops following on a keyboard scroll up", () => {
        const onFollowChange = vi.fn();
        const host = mount(
            <VirtualList
                items={rows(50)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail
                onFollowChange={onFollowChange}
            />,
        );
        const viewport = viewportOf(host);
        stubViewportHeight(viewport, VIEWPORT);

        act(() => {
            viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true }));
        });

        expect(onFollowChange).toHaveBeenCalledWith(false);
    });

    it("does not move the reader when it is not following", () => {
        const host = mount(
            <VirtualList
                items={rows(50)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail={false}
            />,
        );
        const viewport = viewportOf(host);
        stubViewportHeight(viewport, VIEWPORT);
        scrollTo(viewport, 200);

        rerender(
            <VirtualList items={rows(400)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} followTail={false} />,
        );

        // 350 rows arrived. The reading position is untouched.
        expect(viewport.scrollTop).toBe(200);
    });

    it("asks to follow again when the human scrolls back to the bottom", () => {
        const onFollowChange = vi.fn();
        const host = mount(
            <VirtualList
                items={rows(50)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail={false}
                onFollowChange={onFollowChange}
            />,
        );
        const viewport = viewportOf(host);
        stubViewportHeight(viewport, VIEWPORT);

        scrollTo(viewport, 50 * ROW_SHORT - VIEWPORT);

        expect(onFollowChange).toHaveBeenCalledWith(true);
    });

    it("is controlled — it never follows on its own say-so", () => {
        // `followTail` is the consumer's state, per the component contract: an
        // agent must be able to read and write it. A component that flipped its
        // own internal flag would be unreadable from a bridge.
        const host = mount(
            <VirtualList items={rows(50)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} followTail />,
        );
        const viewport = viewportOf(host);
        stubViewportHeight(viewport, VIEWPORT);

        act(() => {
            viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: -120, bubbles: true }));
        });

        // `onFollowChange` fired, but the prop still says `true`, so it is still
        // following: the consumer decides, not the component.
        rerender(
            <VirtualList items={rows(80)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} followTail />,
        );
        expect(viewport.scrollTop).toBeCloseTo(80 * ROW_SHORT - VIEWPORT, 0);
    });
});

describe("the unseen count behind the pill", () => {
    it("counts rows that arrived while the reader was away", () => {
        const onUnseenChange = vi.fn();
        const host = mount(
            <VirtualList
                items={rows(50)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail={false}
                onUnseenChange={onUnseenChange}
            />,
        );
        stubViewportHeight(viewportOf(host), VIEWPORT);

        rerender(
            <VirtualList
                items={rows(57)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail={false}
                onUnseenChange={onUnseenChange}
            />,
        );

        expect(onUnseenChange).toHaveBeenCalledWith(7);
    });

    it("never reports a backlog while following, because nothing is unseen", () => {
        const onUnseenChange = vi.fn();
        const host = mount(
            <VirtualList
                items={rows(50)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail
                onUnseenChange={onUnseenChange}
            />,
        );
        stubViewportHeight(viewportOf(host), VIEWPORT);

        rerender(
            <VirtualList
                items={rows(70)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail
                onUnseenChange={onUnseenChange}
            />,
        );

        // Asserted over every call rather than the last, so a transient
        // non-zero blip that would flash the pill on screen still fails.
        for (const [count] of onUnseenChange.mock.calls) expect(count).toBe(0);
    });

    it("clears the backlog once the reader follows again", () => {
        const onUnseenChange = vi.fn();
        const host = mount(
            <VirtualList
                items={rows(50)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail={false}
                onUnseenChange={onUnseenChange}
            />,
        );
        stubViewportHeight(viewportOf(host), VIEWPORT);

        rerender(
            <VirtualList
                items={rows(57)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail={false}
                onUnseenChange={onUnseenChange}
            />,
        );
        expect(onUnseenChange).toHaveBeenCalledWith(7);

        // The consumer flipped `followTail` back on after the human hit the pill.
        rerender(
            <VirtualList
                items={rows(57)}
                renderRow={renderRow}
                height={VIEWPORT}
                estimateRowHeight={ROW_SHORT}
                followTail
                onUnseenChange={onUnseenChange}
            />,
        );

        expect(onUnseenChange).toHaveBeenLastCalledWith(0);
    });
});

describe("handles and semantics", () => {
    it("carries the stable handles an agent navigates by", () => {
        const host = mount(
            <VirtualList items={rows(10)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} />,
        );

        expect(host.querySelector("[data-react-fancy-virtual-list]")).not.toBeNull();
        expect(host.querySelector("[data-react-fancy-virtual-list-sizer]")).not.toBeNull();
        expect(host.querySelector("[data-react-fancy-virtual-list-window]")).not.toBeNull();
        // Every row is addressable by its own id, which is what `scrollToId`
        // and an MCP bridge both need.
        expect(host.querySelector('[data-react-fancy-virtual-row-id="r-3"]')).not.toBeNull();
    });

    it("renders nothing but the shell when there are no rows", () => {
        const host = mount(
            <VirtualList items={[]} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} />,
        );

        expect(renderedIds(host)).toEqual([]);
        const sizer = host.querySelector<HTMLElement>("[data-react-fancy-virtual-list-sizer]")!;
        expect(parseFloat(sizer.style.height)).toBe(0);
    });

    it("survives a runtime with no ResizeObserver", () => {
        // Already the condition for every test here (see beforeEach), asserted
        // explicitly so a future refactor that hard-requires it fails loudly
        // rather than only in an old browser.
        expect((globalThis as { ResizeObserver?: unknown }).ResizeObserver).toBeUndefined();

        const host = mount(
            <VirtualList items={rows(100)} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} />,
        );

        expect(renderedIds(host).length).toBeGreaterThan(0);
    });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VirtualList } from "../src/components/VirtualList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CC-fancy-0042: an agent thread pages older history in at the TOP ("load
 * earlier"). Without anchoring, prepending rows leaves `scrollTop` where it
 * was, so everything the reader was looking at jumps down by the height of the
 * new rows. Genie hand-rolled a keep-place for this outside the list.
 *
 * `anchorOnPrepend` keeps the row at the top of the viewport at the same
 * on-screen offset across a prepend, and across the new rows being measured
 * at heights other than the estimate. Opt-in, so no existing list moves.
 *
 * Also pins the intent-break cases the original suite did not cover: a touch
 * drag up, and that the list's OWN scrolls never ask to stop following.
 *
 * Layout is stubbed (see virtual-list.test.tsx): `tall-*` rows measure 100px,
 * everything else 20px.
 */

const ROW_SHORT = 20;
const VIEWPORT = 200;
const roots: Root[] = [];

const heightForId = (id: string) => (id.startsWith("tall-") ? 100 : ROW_SHORT);

function stubLayout() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const rowId = this.getAttribute("data-react-fancy-virtual-row-id");
    const height = rowId === null ? 0 : heightForId(rowId);
    return { width: 400, height, top: 0, left: 0, right: 400, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
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
  act(() => roots[roots.length - 1]!.render(el));
}

const viewportOf = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-virtual-list]")!;

function stubViewportHeight(viewport: HTMLElement, px: number) {
  Object.defineProperty(viewport, "clientHeight", { value: px, configurable: true });
}

function scrollTo(viewport: HTMLElement, top: number) {
  viewport.scrollTop = top;
  act(() => {
    viewport.dispatchEvent(new Event("scroll"));
  });
}

type Row = { id: string; text: string };
const rows = (count: number, prefix = "r"): Row[] => Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, text: `row ${i}` }));
const renderRow = (item: Row) => <span>{item.text}</span>;

beforeEach(() => {
  stubLayout();
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined;
});

afterEach(() => {
  roots.splice(0).forEach((r) => act(() => r.unmount()));
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function list(items: Row[], extra: Record<string, unknown> = {}) {
  return <VirtualList items={items} renderRow={renderRow} height={VIEWPORT} estimateRowHeight={ROW_SHORT} {...extra} />;
}

describe("anchorOnPrepend", () => {
  it("keeps the row the reader was on in place when earlier rows are prepended", () => {
    const base = rows(100);
    const host = mount(list(base, { anchorOnPrepend: true }));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);
    scrollTo(vp, 400); // r-20 at the top

    rerender(list([...rows(10, "old"), ...base], { anchorOnPrepend: true }));

    // Ten 20px rows went in above r-20, so it now starts at 600.
    expect(vp.scrollTop).toBe(600);
  });

  it("holds the place while prepended rows are measured taller than the estimate", () => {
    const base = rows(100);
    const host = mount(list(base, { anchorOnPrepend: true }));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);
    // r-2 at the top, so the prepended rows land inside the rendered window and
    // are measured (rows never rendered keep their estimate until they are).
    scrollTo(vp, 40);

    rerender(list([...rows(3, "tall"), ...base], { anchorOnPrepend: true }));
    // A render for the measurement to settle, as the next frame would.
    rerender(list([...rows(3, "tall"), ...base], { anchorOnPrepend: true }));

    // Three rows measured at 100px each, not the 20px estimate: r-2 starts at 300 + 40.
    expect(vp.scrollTop).toBe(340);
  });

  it("holds the offset inside the row, not just the row", () => {
    const base = rows(100);
    const host = mount(list(base, { anchorOnPrepend: true }));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);
    scrollTo(vp, 410); // 10px into r-20

    rerender(list([...rows(5, "old"), ...base], { anchorOnPrepend: true }));
    expect(vp.scrollTop).toBe(510);
  });

  it("does nothing on an append", () => {
    const base = rows(100);
    const host = mount(list(base, { anchorOnPrepend: true }));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);
    scrollTo(vp, 400);

    rerender(list([...base, ...rows(10, "new")], { anchorOnPrepend: true }));
    expect(vp.scrollTop).toBe(400);
  });

  it("is off by default: without it a prepend leaves scrollTop where it was", () => {
    const base = rows(100);
    const host = mount(list(base));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);
    scrollTo(vp, 400);

    rerender(list([...rows(10, "old"), ...base]));
    expect(vp.scrollTop).toBe(400);
  });

  it("a prepend while following still pins the bottom, and never asks to stop following", () => {
    const onFollowChange = vi.fn();
    const base = rows(50);
    const host = mount(list(base, { anchorOnPrepend: true, followTail: true, onFollowChange }));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);

    rerender(list([...rows(10, "old"), ...base], { anchorOnPrepend: true, followTail: true, onFollowChange }));
    expect(vp.scrollTop).toBe(60 * ROW_SHORT - VIEWPORT);
    expect(onFollowChange).not.toHaveBeenCalledWith(false);
  });

  it("the anchoring scroll is the list's own, so its scroll event never reads as the reader moving", () => {
    const onFollowChange = vi.fn();
    const base = rows(100);
    const host = mount(list(base, { anchorOnPrepend: true, onFollowChange }));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);
    scrollTo(vp, 400);

    // Measured SHORTER than estimated: the anchor moves the list UP, which a
    // human scroll would read as "scrolled up".
    rerender(list([...rows(4, "old"), ...base], { anchorOnPrepend: true, onFollowChange, estimateRowHeight: 60 }));
    act(() => {
      vp.dispatchEvent(new Event("scroll"));
    });
    expect(onFollowChange).not.toHaveBeenCalledWith(false);
  });
});

describe("tail-follow intent-break, the cases not covered elsewhere", () => {
  it("a touch drag up stops following", () => {
    const onFollowChange = vi.fn();
    const host = mount(list(rows(50), { followTail: true, onFollowChange }));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);

    const touch = (type: string, y: number) => {
      const ev = new Event(type, { bubbles: true }) as Event & { touches: unknown };
      Object.defineProperty(ev, "touches", { value: [{ clientY: y }] });
      act(() => {
        vp.dispatchEvent(ev);
      });
    };
    touch("touchstart", 100);
    touch("touchmove", 140); // finger moving down drags the content down: scrolling up

    expect(onFollowChange).toHaveBeenCalledWith(false);
  });

  it("a touch jitter below the slop does not", () => {
    const onFollowChange = vi.fn();
    const host = mount(list(rows(50), { followTail: true, onFollowChange }));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);
    const touch = (type: string, y: number) => {
      const ev = new Event(type, { bubbles: true });
      Object.defineProperty(ev, "touches", { value: [{ clientY: y }] });
      act(() => {
        vp.dispatchEvent(ev);
      });
    };
    touch("touchstart", 100);
    touch("touchmove", 102);
    expect(onFollowChange).not.toHaveBeenCalledWith(false);
  });

  it("the list's own pinning scrolls never ask to stop following", () => {
    const onFollowChange = vi.fn();
    const host = mount(list(rows(50), { followTail: true, onFollowChange }));
    const vp = viewportOf(host);
    stubViewportHeight(vp, VIEWPORT);
    for (let n = 51; n < 60; n++) {
      rerender(list(rows(n), { followTail: true, onFollowChange }));
      act(() => {
        vp.dispatchEvent(new Event("scroll"));
      });
    }
    expect(onFollowChange).not.toHaveBeenCalledWith(false);
  });
});

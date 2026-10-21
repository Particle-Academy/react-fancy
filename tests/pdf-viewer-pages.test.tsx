// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { PdfViewer } from "../src/components/PdfViewer";
import { MediaViewer } from "../src/components/MediaViewer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Page-image mode (react-fancy#36). The APP renders its PDF to page images
 * behind its own auth; the viewer only shows them, under a policy. So in this
 * mode the viewer must never fetch or reference a PDF: the page URLs are the
 * only network requests it makes.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  vi.unstubAllGlobals();
});

const pageUrl = (page: number, scale: number) => `/doc/7/page/${page}.png?scale=${scale}`;
const sel = (host: HTMLElement, attr: string) =>
  host.querySelector<HTMLElement>(`[data-react-fancy-pdf-viewer-${attr}]`);
const images = (host: HTMLElement) =>
  Array.from(host.querySelectorAll<HTMLImageElement>("img[data-react-fancy-pdf-viewer-image]"));

/** An IntersectionObserver the test drives, so "near the viewport" is explicit. */
class FakeIO {
  static all: FakeIO[] = [];
  targets = new Set<Element>();
  constructor(public cb: IntersectionObserverCallback) {
    FakeIO.all.push(this);
  }
  observe(el: Element) {
    this.targets.add(el);
  }
  unobserve(el: Element) {
    this.targets.delete(el);
  }
  disconnect() {
    this.targets.clear();
  }
  takeRecords() {
    return [];
  }
  /** Mark the given pages as near (and every other observed page as far). */
  static show(pages: number[]) {
    for (const io of FakeIO.all) {
      const entries = Array.from(io.targets).map((target) => ({
        target,
        isIntersecting: pages.includes(Number((target as HTMLElement).dataset.page)),
      })) as unknown as IntersectionObserverEntry[];
      act(() => io.cb(entries, io as unknown as IntersectionObserver));
    }
  }
}

describe("PdfViewer page-image mode", () => {
  beforeEach(() => {
    FakeIO.all = [];
  });

  it("renders page images from url(page, scale)", () => {
    const url = vi.fn(pageUrl);
    const { host } = mount(<PdfViewer pages={{ count: 3, url }} />);
    const imgs = images(host);
    expect(imgs.length).toBe(3);
    expect(imgs[0].getAttribute("src")).toBe("/doc/7/page/1.png?scale=1");
    expect(url).toHaveBeenCalledWith(1, 1);
    expect(url).toHaveBeenCalledWith(3, 1);
    // A slot per page, each with a stable handle an agent can point at.
    expect(host.querySelectorAll("[data-react-fancy-pdf-viewer-page]").length).toBe(3);
    expect(sel(host, "page-label")!.textContent).toContain("1 / 3");
  });

  it("never requests or embeds a PDF URL, even with a src passed", () => {
    const { host } = mount(<PdfViewer src="/secret/contract.pdf" pages={{ count: 2, url: pageUrl }} frame />);
    expect(host.querySelector("object, iframe, embed")).toBeNull();
    expect(host.querySelector("a[href]")).toBeNull();
    expect(host.innerHTML).not.toContain("contract.pdf");
  });

  it("renders only the pages near the viewport", () => {
    vi.stubGlobal("IntersectionObserver", FakeIO);
    const url = vi.fn(pageUrl);
    const { host } = mount(<PdfViewer pages={{ count: 40, url }} />);
    // Before anything is observed: the current page and its neighbour only.
    expect(images(host).map((i) => i.closest<HTMLElement>("[data-page]")!.dataset.page)).toEqual(["1", "2"]);
    FakeIO.show([20, 21]);
    const shown = images(host).map((i) => i.closest<HTMLElement>("[data-page]")!.dataset.page);
    expect(shown).toContain("20");
    expect(shown).toContain("21");
    expect(shown).not.toContain("30");
    expect(url).not.toHaveBeenCalledWith(30, expect.anything());
  });

  it("pages under control: page / onPageChange", () => {
    const seen: number[] = [];
    const { host, rerender } = mount(
      <PdfViewer pages={{ count: 5, url: pageUrl }} page={2} onPageChange={(p) => seen.push(p)} />,
    );
    expect(sel(host, "page-label")!.textContent).toContain("2 / 5");
    act(() => sel(host, "next")!.click());
    expect(seen).toEqual([3]);
    // Controlled: it stays on 2 until the parent moves it.
    expect(sel(host, "page-label")!.textContent).toContain("2 / 5");
    rerender(<PdfViewer pages={{ count: 5, url: pageUrl }} page={5} onPageChange={(p) => seen.push(p)} />);
    expect(sel(host, "page-label")!.textContent).toContain("5 / 5");
    expect((sel(host, "next") as HTMLButtonElement).disabled).toBe(true);
  });

  it("zooms under control, and asks for sharper images as it zooms", () => {
    const zooms: number[] = [];
    const url = vi.fn(pageUrl);
    const { host } = mount(<PdfViewer pages={{ count: 1, url }} onZoomChange={(z) => zooms.push(z)} />);
    act(() => sel(host, "zoom-in")!.click());
    act(() => sel(host, "zoom-in")!.click());
    expect(zooms).toEqual([1.25, 1.56]);
    expect(sel(host, "zoom-reset")!.textContent).toBe("156%");
    // 1.56 rounds up to the 2x bucket.
    expect(images(host)[0].getAttribute("src")).toBe("/doc/7/page/1.png?scale=2");
    act(() => sel(host, "fit-width")!.click());
    expect(zooms.at(-1)).toBe(1);
  });

  it("keeps the current page in view when the viewer is resized (full screen)", () => {
    let fire: () => void = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          fire = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { host } = mount(<PdfViewer pages={{ count: 5, url: pageUrl }} page={3} />);
    const scroller = sel(host, "pages")!;
    let width = 600;
    Object.defineProperty(scroller, "clientWidth", { configurable: true, get: () => width });
    const writes: number[] = [];
    Object.defineProperty(scroller, "scrollTop", { configurable: true, get: () => 0, set: (v: number) => writes.push(v) });
    const slot = host.querySelector<HTMLElement>('[data-page="3"]')!;
    let top = 1000;
    Object.defineProperty(slot, "offsetTop", { configurable: true, get: () => top });

    act(() => fire()); // first measurement: records the width, moves nothing
    // Full screen: wider, so every page is taller and page 3 starts lower.
    width = 1200;
    top = 2000;
    act(() => fire());
    expect(writes.at(-1)).toBe(2000 - 16);
  });

  it("has no search, because page images carry no text", () => {
    const { host } = mount(<PdfViewer pages={{ count: 1, url: pageUrl }} />);
    expect(images(host).length).toBe(1);
    expect(host.querySelector('input[type="search"]')).toBeNull();
    expect(sel(host, "search")).toBeNull();
  });

  it("goes full screen through the frame", () => {
    const { host } = mount(<PdfViewer pages={{ count: 1, url: pageUrl }} frame />);
    expect(images(host).length).toBe(1);
    expect(host.querySelector("[data-react-fancy-faux-client-fullscreen]")).not.toBeNull();
  });
});

describe("PdfViewer policy", () => {
  const mountPolicy = (policy: Parameters<typeof PdfViewer>[0]["policy"]) =>
    mount(<PdfViewer pages={{ count: 2, url: pageUrl }} policy={policy} />).host;

  it("allows everything by default", () => {
    const host = mountPolicy(undefined);
    const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    images(host)[0].dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(images(host)[0].getAttribute("draggable")).not.toBe("false");
    expect(host.querySelector("style")?.textContent ?? "").not.toContain("@media print");
  });

  it("download: false blocks the context menu and dragging the images", () => {
    const host = mountPolicy({ download: false });
    const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    images(host)[0].dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(images(host).every((i) => i.getAttribute("draggable") === "false")).toBe(true);
  });

  it("print: false blanks the viewer in print CSS and intercepts Ctrl/Cmd+P", () => {
    const host = mountPolicy({ print: false });
    const root = host.querySelector<HTMLElement>("[data-react-fancy-pdf-viewer]")!;
    expect(root.dataset.printBlocked).toBe("true");
    const css = host.querySelector("style")!.textContent!;
    expect(css).toContain("@media print");
    expect(css).toContain('[data-print-blocked="true"]');

    for (const mod of [{ ctrlKey: true }, { metaKey: true }]) {
      const ev = new KeyboardEvent("keydown", { key: "p", bubbles: true, cancelable: true, ...mod });
      images(host)[0].dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }
  });

  it("copy: false turns selection off", () => {
    const host = mountPolicy({ copy: false });
    const root = host.querySelector<HTMLElement>("[data-react-fancy-pdf-viewer]")!;
    expect(root.style.userSelect).toBe("none");
  });

  it('screenshot: "deter" obscures the pages while the tab is hidden or the window blurred', () => {
    const host = mountPolicy({ screenshot: "deter" });
    const root = host.querySelector<HTMLElement>("[data-react-fancy-pdf-viewer]")!;
    expect(root.dataset.obscured).toBe("false");

    let hidden = true;
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(root.dataset.obscured).toBe("true");
    expect(sel(host, "pages")!.style.filter).toContain("blur");

    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(root.dataset.obscured).toBe("false");

    act(() => window.dispatchEvent(new Event("blur")));
    expect(root.dataset.obscured).toBe("true");
    act(() => window.dispatchEvent(new Event("focus")));
    expect(root.dataset.obscured).toBe("false");
    // @ts-expect-error -- drop the test's own property
    delete document.visibilityState;
  });

  it('screenshot: "deter" obscures on PrintScreen, best effort', () => {
    vi.useFakeTimers();
    try {
      const host = mountPolicy({ screenshot: "deter" });
      const root = host.querySelector<HTMLElement>("[data-react-fancy-pdf-viewer]")!;
      act(() => window.dispatchEvent(new KeyboardEvent("keyup", { key: "PrintScreen" })));
      expect(root.dataset.obscured).toBe("true");
      act(() => vi.advanceTimersByTime(2000));
      expect(root.dataset.obscured).toBe("false");
    } finally {
      vi.useRealTimers();
    }
  });

  it('screenshot "allow" does not react to focus', () => {
    const host = mountPolicy({ screenshot: "allow" });
    act(() => window.dispatchEvent(new Event("blur")));
    expect(host.querySelector<HTMLElement>("[data-react-fancy-pdf-viewer]")!.dataset.obscured).toBe("false");
  });
});

describe("PdfViewer watermark", () => {
  it("tiles the text over every page, out of the pointer's way", () => {
    const { host } = mount(
      <PdfViewer pages={{ count: 2, url: pageUrl }} watermark={{ text: "Jane Doe <jane@example.com>", opacity: 0.2 }} />,
    );
    const marks = Array.from(host.querySelectorAll<HTMLElement>("[data-react-fancy-pdf-viewer-watermark]"));
    expect(marks.length).toBe(2);
    for (const m of marks) {
      expect(m.style.pointerEvents).toBe("none");
      expect(m.textContent).toContain("Jane Doe <jane@example.com>");
    }
  });

  it("is absent unless asked", () => {
    const { host } = mount(<PdfViewer pages={{ count: 1, url: pageUrl }} />);
    expect(images(host).length).toBe(1);
    expect(sel(host, "watermark")).toBeNull();
  });
});

describe("MediaViewer forwards page-image mode", () => {
  it("passes pages / policy / watermark to PdfViewer through pdfProps", () => {
    const { host } = mount(
      <MediaViewer
        src="/secret/contract.pdf"
        kind="pdf"
        pdfProps={{ pages: { count: 2, url: pageUrl }, policy: { download: false }, watermark: { text: "J" } }}
      />,
    );
    expect(images(host).length).toBe(2);
    expect(host.innerHTML).not.toContain("contract.pdf");
    expect(images(host)[0].getAttribute("draggable")).toBe("false");
    expect(sel(host, "watermark")).not.toBeNull();
  });
});

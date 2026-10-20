// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { ImageViewer } from "../src/components/ImageViewer";
import { PdfViewer } from "../src/components/PdfViewer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * The file viewers carry the FauxClient frame (zoom and full screen, revealed on
 * hover), opt-in with `frame` so nobody's existing viewer changes in a minor.
 *
 * Each zooms the way its content can: the image through its own pan/zoom
 * viewport (the frame's bar replaces the image's boxed one), the PDF through
 * the browser's PDF toolbar, which knows the page size. The frame cannot: a
 * plugin fits the page to its box, so scaling the box only re-fits it.
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
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const frame = (host: HTMLElement) => host.querySelector("[data-react-fancy-faux-client]");
const q = (host: HTMLElement, attr: string) => host.querySelector(`[data-react-fancy-faux-client-${attr}]`);

describe("ImageViewer frame", () => {
  it("has no frame unless asked", () => {
    expect(frame(mount(<ImageViewer src="/a.png" />))).toBeNull();
  });

  it("drives the image's own zoom from the frame's bar, and drops its boxed bar", () => {
    const seen: number[] = [];
    const host = mount(
      <ImageViewer src="/a.png" frame onViewportChange={(v) => seen.push(v.zoom)} />,
    );
    const img = host.querySelector("img")!;
    act(() => img.dispatchEvent(new Event("load")));

    expect(frame(host)).not.toBeNull();
    expect(host.querySelector("[data-react-fancy-image-viewer-controls]")).toBeNull();
    // It fills the frame; at its standalone size it collapsed to nothing there.
    expect(host.querySelector("[data-react-fancy-image-viewer]")!.className).toMatch(/\bh-full\b/);

    act(() => (q(host, "zoom-in") as HTMLButtonElement).click());
    expect(seen.at(-1)).toBeCloseTo(1.25);
    expect(q(host, "zoom-reset")!.textContent).toBe("125%");
    // The frame did not scale the image a second time.
    expect((q(host, "content") as HTMLElement).getAttribute("style") ?? "").not.toContain("zoom");

    act(() => (q(host, "zoom-reset") as HTMLButtonElement).click());
    expect(seen.at(-1)).toBe(1);
  });
});

describe("PdfViewer frame", () => {
  it("has no frame unless asked", () => {
    expect(frame(mount(<PdfViewer src="/r.pdf" />))).toBeNull();
  });

  it("adds full screen, and leaves zoom to the browser's PDF toolbar", () => {
    const host = mount(<PdfViewer src="/r.pdf" frame />);
    expect(frame(host)).not.toBeNull();
    expect(q(host, "fullscreen")).not.toBeNull();
    expect(q(host, "zoom-in")).toBeNull();
    expect(host.querySelector("object")?.getAttribute("data")).toBe("/r.pdf");
    // In the address bar: hover over the plugin never reaches the frame, so
    // controls over it could not be revealed.
    expect(q(host, "fullscreen")!.closest(".border-b")).not.toBeNull();
  });
});

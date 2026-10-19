// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { FauxClient } from "../src/components/FauxClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * A viewer in a frame needs to be read at more than one size: a slide or a sheet
 * shrunk to fit a panel is unreadable, and the lab showed every document that way
 * with no way to look closer. `controls` gives the frame a zoom bar and a
 * full-screen button, controllable so an agent can drive them too.
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

const click = (el: Element | null) => act(() => (el as HTMLElement).click());
const q = (host: HTMLElement, attr: string) => host.querySelector(`[data-react-fancy-faux-client-${attr}]`);

describe("FauxClient controls", () => {
  it("has no controls unless asked", () => {
    const host = mount(<FauxClient variant="device">x</FauxClient>);
    expect(q(host, "controls")).toBeNull();
  });

  it("zooms the content in and out, and the percentage resets it", () => {
    const host = mount(<FauxClient variant="device" controls>content</FauxClient>);
    const content = q(host, "content") as HTMLElement;
    expect(q(host, "zoom-reset")!.textContent).toBe("100%");

    click(q(host, "zoom-in"));
    expect(q(host, "zoom-reset")!.textContent).toBe("125%");
    expect(content.style.zoom).toBe("1.25");

    click(q(host, "zoom-out"));
    click(q(host, "zoom-out"));
    expect(q(host, "zoom-reset")!.textContent).toBe("80%");

    click(q(host, "zoom-reset"));
    expect(q(host, "zoom-reset")!.textContent).toBe("100%");
  });

  it("stops at minZoom and maxZoom", () => {
    const host = mount(<FauxClient controls minZoom={1} maxZoom={1.5}>c</FauxClient>);
    click(q(host, "zoom-out"));
    expect(q(host, "zoom-reset")!.textContent).toBe("100%");
    for (let i = 0; i < 5; i++) click(q(host, "zoom-in"));
    expect(q(host, "zoom-reset")!.textContent).toBe("150%");
    expect((q(host, "zoom-in") as HTMLButtonElement).disabled).toBe(true);
  });

  it("is controllable, so an agent can set the zoom", () => {
    const seen: number[] = [];
    function Host() {
      const [zoom, setZoom] = useState(2);
      return (
        <FauxClient controls zoom={zoom} onZoomChange={(z) => { seen.push(z); setZoom(z); }}>
          c
        </FauxClient>
      );
    }
    const host = mount(<Host />);
    expect(q(host, "zoom-reset")!.textContent).toBe("200%");
    click(q(host, "zoom-out"));
    expect(seen).toEqual([1.6]);
  });

  it("puts the frame itself in full screen, and takes it out again", async () => {
    const host = mount(<FauxClient variant="device" controls>c</FauxClient>);
    const frame = host.querySelector("[data-react-fancy-faux-client]") as HTMLElement;
    const request = vi.fn(() => {
      Object.defineProperty(document, "fullscreenElement", { configurable: true, value: frame });
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    const exit = vi.fn(() => {
      Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    frame.requestFullscreen = request;
    document.exitFullscreen = exit;

    const button = q(host, "fullscreen") as HTMLButtonElement;
    expect(button.getAttribute("aria-label")).toBe("Full screen");
    click(button);
    expect(request).toHaveBeenCalledTimes(1);
    expect(frame.getAttribute("data-fullscreen")).toBe("true");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Exit full screen");

    click(button);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(frame.getAttribute("data-fullscreen")).toBe("false");
  });

  it("keeps the controls out of sight until the frame is hovered or focused", () => {
    const host = mount(<FauxClient variant="device" controls>c</FauxClient>);
    const bar = q(host, "controls") as HTMLElement;
    expect(bar.className).toContain("opacity-0");
    expect(bar.className).toContain("group-hover/faux-client:opacity-100");
    expect(bar.className).toContain("focus-within:opacity-100");
    // No hover on touch: always shown there, or it could never be reached.
    expect(bar.className).toContain("[@media(hover:none)]:opacity-100");
    expect(host.querySelector("[data-react-fancy-faux-client]")!.className).toContain("group/faux-client");
  });

  it("sits inline in the address bar of a browser frame", () => {
    const host = mount(<FauxClient variant="browser" url="report.pptx" controls>c</FauxClient>);
    const bar = q(host, "controls") as HTMLElement;
    expect(bar.closest(".border-b")).not.toBeNull();
  });

  it("fills its parent's height with `fill`, for content that sizes itself to its box", () => {
    const host = mount(<FauxClient variant="device" fill controls>c</FauxClient>);
    const frame = host.querySelector("[data-react-fancy-faux-client]") as HTMLElement;
    const content = q(host, "content") as HTMLElement;
    expect(frame.className).toMatch(/\bh-full\b/);
    expect(frame.className).toMatch(/\bflex-col\b/);
    expect(content.parentElement!.className).toMatch(/\bflex-1\b/);
    expect(content.className).toMatch(/\bh-full\b/);

    // Without it, nothing changes for existing frames.
    const plain = mount(<FauxClient variant="device">c</FauxClient>);
    expect((plain.querySelector("[data-react-fancy-faux-client]") as HTMLElement).className).not.toMatch(/\bh-full\b/);
  });

  it("leaves the zoom to the content with applyZoom={false}", () => {
    // A viewer that fits itself to its box (a slide) re-fits under CSS zoom and
    // ends up the same size, with its own chrome enlarged. It zooms itself; the
    // frame keeps the controls and the state.
    const seen: number[] = [];
    const host = mount(<FauxClient controls applyZoom={false} onZoomChange={(z) => seen.push(z)}>c</FauxClient>);
    click(q(host, "zoom-in"));
    expect(seen).toEqual([1.25]);
    expect((q(host, "content") as HTMLElement).style.zoom).toBe("");
    expect(q(host, "zoom-reset")!.textContent).toBe("125%");
  });

  it("can show zoom without full screen, or the reverse", () => {
    const a = mount(<FauxClient controls={{ fullscreen: false }}>c</FauxClient>);
    expect(q(a, "fullscreen")).toBeNull();
    expect(q(a, "zoom-in")).not.toBeNull();
    const b = mount(<FauxClient controls={{ zoom: false }}>c</FauxClient>);
    expect(q(b, "zoom-in")).toBeNull();
    expect(q(b, "fullscreen")).not.toBeNull();
  });
});

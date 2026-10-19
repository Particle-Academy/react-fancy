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

  it("can show zoom without full screen, or the reverse", () => {
    const a = mount(<FauxClient controls={{ fullscreen: false }}>c</FauxClient>);
    expect(q(a, "fullscreen")).toBeNull();
    expect(q(a, "zoom-in")).not.toBeNull();
    const b = mount(<FauxClient controls={{ zoom: false }}>c</FauxClient>);
    expect(q(b, "zoom-in")).toBeNull();
    expect(q(b, "fullscreen")).not.toBeNull();
  });
});

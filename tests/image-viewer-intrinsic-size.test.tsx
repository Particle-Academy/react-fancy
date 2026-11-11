// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { ImageViewer } from "../src/components/ImageViewer";
import { MediaViewer } from "../src/components/MediaViewer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * K6 from the lab's full-kit benchmark (2026-11-10): the image is absolutely
 * positioned inside the viewer, so a viewer with no explicit height had no
 * in-flow content and collapsed to 0 px in an auto-height grid.
 *
 * jsdom does no layout, so this pins the mechanism that gives it a box: an
 * in-flow sizer carrying an aspect ratio (4 / 3 until the image reports its
 * natural size, then that size, or whatever `aspectRatio` says). An explicit
 * height still wins, because the sizer only sets a minimum the container's
 * own height overrides (it is clipped by the container's overflow).
 */

const roots: Array<() => void> = [];
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  roots.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}
afterEach(() => {
  while (roots.length) roots.pop()!();
});

const sizerOf = (root: ParentNode) => root.querySelector<HTMLElement>("[data-react-fancy-image-viewer-sizer]");

describe("ImageViewer has an intrinsic box (K6)", () => {
  it("server-renders an in-flow sizer with a default 4 / 3 aspect", () => {
    const doc = new DOMParser().parseFromString(renderToString(<ImageViewer src="/a.png" alt="a" />), "text/html");
    const sizer = sizerOf(doc);
    expect(sizer).not.toBeNull();
    expect(sizer!.getAttribute("aria-hidden")).toBe("true");
    expect(sizer!.style.aspectRatio.replace(/\s/g, "")).toBe("4/3");
    // In flow: not absolutely positioned like the canvas.
    expect(sizer!.className).not.toMatch(/\babsolute\b/);
  });

  it("takes the image's natural aspect once it loads", () => {
    const host = mount(<ImageViewer src="/a.png" alt="a" />);
    const img = host.querySelector("img")!;
    Object.defineProperty(img, "naturalWidth", { value: 1600 });
    Object.defineProperty(img, "naturalHeight", { value: 900 });
    act(() => {
      img.dispatchEvent(new Event("load"));
    });
    expect(sizerOf(host)!.style.aspectRatio.replace(/\s/g, "")).toBe("1600/900");
  });

  it("an explicit aspectRatio prop wins over the natural size", () => {
    const host = mount(<ImageViewer src="/a.png" alt="a" aspectRatio={1} />);
    const img = host.querySelector("img")!;
    Object.defineProperty(img, "naturalWidth", { value: 1600 });
    Object.defineProperty(img, "naturalHeight", { value: 900 });
    act(() => {
      img.dispatchEvent(new Event("load"));
    });
    expect(sizerOf(host)!.style.aspectRatio.replace(/\s/g, "")).toMatch(/^1(\/1)?$/);
  });

  it("MediaViewer gets the intrinsic box for images, and passes an aspect through imageProps", () => {
    const plain = mount(<MediaViewer src="/a.png" mime="image/png" alt="a" />);
    expect(sizerOf(plain)!.style.aspectRatio.replace(/\s/g, "")).toBe("4/3");
    const host = mount(<MediaViewer src="/a.png" mime="image/png" alt="a" imageProps={{ aspectRatio: 2 }} />);
    expect(sizerOf(host)!.style.aspectRatio.replace(/\s/g, "")).toMatch(/^2(\/1)?$/);
  });

  it("an explicit height is left alone", () => {
    const host = mount(<ImageViewer src="/a.png" alt="a" style={{ height: 320 }} />);
    const root = host.querySelector<HTMLElement>("[data-react-fancy-image-viewer]")!;
    expect(root.style.height).toBe("320px");
    expect(root.className).toMatch(/\boverflow-hidden\b/);
  });
});

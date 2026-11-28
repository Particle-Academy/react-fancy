// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Portal, PortalContainerContext } from "../src/components/Portal";

/**
 * A `<Portal>` with nowhere else to go follows the browser's full-screen
 * element. In the Fullscreen API only that element's subtree is painted, so a
 * popup portalled to `<body>` while ANY element is full screen (a 3D viewer, a
 * graph, a video wrapper a host made full screen itself) opens invisibly.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let fullscreenElement: Element | null = null;
Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreenElement });

function goFullscreen(el: Element | null) {
  act(() => {
    fullscreenElement = el;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
}

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

const popup = () => document.querySelector<HTMLElement>("[data-popup]");

afterEach(() => {
  fullscreenElement = null;
  document.body.innerHTML = "";
});

describe("Portal follows the native full-screen element", () => {
  it("portals into document.fullscreenElement when one is set", () => {
    const viewer = document.createElement("div");
    document.body.append(viewer);
    goFullscreen(viewer);
    const view = mount(
      <Portal>
        <div data-popup="" />
      </Portal>,
    );
    expect(popup()?.parentElement).toBe(viewer);
    view.unmount();
  });

  it("moves an open popup in on enter and back to <body> on exit", () => {
    const viewer = document.createElement("div");
    document.body.append(viewer);
    const view = mount(
      <Portal>
        <div data-popup="" />
      </Portal>,
    );
    expect(popup()?.parentElement).toBe(document.body);
    goFullscreen(viewer);
    expect(popup()?.parentElement).toBe(viewer);
    goFullscreen(null);
    expect(popup()?.parentElement).toBe(document.body);
    view.unmount();
  });

  it("follows the webkit-prefixed element and event (Safari)", () => {
    const viewer = document.createElement("div");
    document.body.append(viewer);
    const view = mount(
      <Portal>
        <div data-popup="" />
      </Portal>,
    );
    Object.defineProperty(document, "webkitFullscreenElement", { configurable: true, get: () => viewer });
    act(() => {
      document.dispatchEvent(new Event("webkitfullscreenchange"));
    });
    expect(popup()?.parentElement).toBe(viewer);
    delete (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement;
    view.unmount();
  });

  it("stays in <body> when the full-screen element cannot hold children (a video, a canvas)", () => {
    for (const tag of ["video", "canvas", "img", "iframe"]) {
      const el = document.createElement(tag);
      document.body.append(el);
      goFullscreen(el);
      const view = mount(
        <Portal>
          <div data-popup="" />
        </Portal>,
      );
      expect(popup()?.parentElement).toBe(document.body);
      view.unmount();
      goFullscreen(null);
    }
  });

  it("an explicit container and a PortalContainerContext still win", () => {
    const viewer = document.createElement("div");
    const landmark = document.createElement("main");
    document.body.append(viewer, landmark);
    goFullscreen(viewer);
    const explicit = mount(
      <Portal container={landmark}>
        <div data-popup="" />
      </Portal>,
    );
    expect(popup()?.parentElement).toBe(landmark);
    explicit.unmount();

    const surface = document.createElement("section");
    viewer.append(surface);
    const contextual = mount(
      <PortalContainerContext.Provider value={surface}>
        <Portal>
          <div data-popup="" />
        </Portal>
      </PortalContainerContext.Provider>,
    );
    expect(popup()?.parentElement).toBe(surface);
    contextual.unmount();
  });
});

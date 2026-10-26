// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, type ReactElement } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { FullScreen } from "../src/components/FullScreen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The top layer — why overlay mode needs it.
 *
 * `position: fixed` is fixed to the VIEWPORT only while no ancestor has a
 * transform, filter, perspective or paint containment. One does, and the
 * overlay is fixed to that ancestor instead: in the showcase a FullScreen inside
 * a Tabs panel came out 1248x95, because `.fancy-fade-in` held its end keyframe
 * (`transform: matrix(1,0,0,1,0,0)`) with `animation-fill-mode: both`. Dialogs
 * centred with `transform` do the same, and that is where MOIC puts editors.
 *
 * A top-layer element's containing block is the viewport whatever its
 * ancestors do. `popover="manual"` + `showPopover()` gets an element there
 * without moving it in the DOM (so nothing remounts) and without light dismiss.
 *
 * jsdom has no popover API, so it is stubbed here; the stub enforces the same
 * preconditions Chromium does (the attribute must be present to show, and the
 * element must be showing to hide). The real-browser proof is the tg-probe page.
 */

type PopoverProto = { showPopover?: () => void; hidePopover?: () => void };
const proto = HTMLElement.prototype as unknown as PopoverProto;

function installPopover(opts: { throwOnShow?: boolean } = {}) {
  const open = new Set<Element>();
  const calls: string[] = [];
  const show = vi.fn(function (this: HTMLElement) {
    calls.push("show");
    if (opts.throwOnShow) throw new DOMException("Not supported", "NotSupportedError");
    if (this.getAttribute("popover") === null) throw new DOMException("Not a popover", "NotSupportedError");
    if (open.has(this)) throw new DOMException("Already open", "InvalidStateError");
    open.add(this);
  });
  const hide = vi.fn(function (this: HTMLElement) {
    calls.push("hide");
    if (!open.has(this)) throw new DOMException("Not open", "InvalidStateError");
    open.delete(this);
  });
  proto.showPopover = show;
  proto.hidePopover = hide;
  return { show, hide, calls, isOpen: (el: Element) => open.has(el), open };
}

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
    target: () => host.querySelector<HTMLElement>("[data-react-fancy-fullscreen]")!,
    toggle: () => host.querySelector<HTMLButtonElement>("[data-react-fancy-fullscreen-toggle]")!,
  };
}

function pressEscape(on: Element) {
  act(() => {
    on.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  });
}

beforeEach(() => {
  delete proto.showPopover;
  delete proto.hidePopover;
});

afterEach(() => {
  delete proto.showPopover;
  delete proto.hidePopover;
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("FullScreen overlay — top layer", () => {
  it("promotes the surface with popover=manual while active", () => {
    const api = installPopover();
    const view = mount(
      <FullScreen>
        <FullScreen.Toggle />
      </FullScreen>,
    );
    const surface = view.target();
    expect(surface.hasAttribute("popover")).toBe(false);
    expect(surface.hasAttribute("data-fullscreen-layer")).toBe(false);

    act(() => view.toggle().click());

    expect(api.show).toHaveBeenCalledTimes(1);
    expect(api.show.mock.contexts[0]).toBe(surface);
    // "manual", never "auto": no light dismiss, no closing on outside clicks.
    expect(surface.getAttribute("popover")).toBe("manual");
    expect(api.isOpen(surface)).toBe(true);
    expect(surface.getAttribute("data-fullscreen-layer")).toBe("top");
    // The layout style still applies: it overrides the UA popover box.
    expect(surface.style.width).toBe("100%");
    expect(surface.style.height).toBe("100%");
    view.unmount();
  });

  it("hides and removes the attribute on Escape, then restores focus and scroll lock", () => {
    const api = installPopover();
    const view = mount(
      <FullScreen>
        <FullScreen.Toggle />
        <input />
      </FullScreen>,
    );
    const surface = view.target();
    const toggle = view.toggle();
    act(() => toggle.focus());
    act(() => toggle.click());
    expect(document.body.style.overflow).toBe("hidden");

    const field = view.host.querySelector("input")!;
    act(() => field.focus());
    pressEscape(field);

    expect(surface.getAttribute("data-fullscreen")).toBe("false");
    expect(api.hide).toHaveBeenCalledTimes(1);
    expect(api.isOpen(surface)).toBe(false);
    // A [popover] that is not open is display:none in every browser, so the
    // attribute must not outlive the full-screen state.
    expect(surface.hasAttribute("popover")).toBe(false);
    expect(surface.hasAttribute("data-fullscreen-layer")).toBe(false);
    expect(document.activeElement).toBe(toggle);
    expect(document.body.style.overflow).toBe("");
    view.unmount();
  });

  it("hides the popover when unmounted while active", () => {
    const api = installPopover();
    const view = mount(<FullScreen fullScreen>x</FullScreen>);
    const surface = view.target();
    expect(api.isOpen(surface)).toBe(true);

    view.unmount();
    expect(api.hide).toHaveBeenCalledTimes(1);
    expect(api.open.size).toBe(0);
    expect(document.body.style.overflow).toBe("");
  });

  it("falls back to the fixed overlay where the popover API does not exist", () => {
    const view = mount(<FullScreen fullScreen>x</FullScreen>);
    const surface = view.target();
    expect(surface.getAttribute("data-fullscreen-layer")).toBe("fixed");
    expect(surface.hasAttribute("popover")).toBe(false);
    expect(surface.style.position).toBe("fixed");
    view.unmount();
  });

  it("falls back to the fixed overlay when showPopover throws, without leaving the attribute", () => {
    installPopover({ throwOnShow: true });
    const view = mount(<FullScreen fullScreen>x</FullScreen>);
    const surface = view.target();
    expect(surface.getAttribute("data-fullscreen")).toBe("true");
    expect(surface.getAttribute("data-fullscreen-layer")).toBe("fixed");
    expect(surface.hasAttribute("popover")).toBe(false);
    view.unmount();
  });

  it("drops to the fixed overlay if something else closes the popover", () => {
    const api = installPopover();
    const view = mount(<FullScreen fullScreen>x</FullScreen>);
    const surface = view.target();

    // Another script calling hidePopover(): the browser fires `toggle` with
    // newState "closed". Left alone, the surface would be display:none while
    // still reporting full screen.
    act(() => {
      api.open.delete(surface);
      const e = new Event("toggle");
      Object.assign(e, { oldState: "open", newState: "closed" });
      surface.dispatchEvent(e);
    });

    expect(surface.getAttribute("data-fullscreen")).toBe("true");
    expect(surface.getAttribute("data-fullscreen-layer")).toBe("fixed");
    expect(surface.hasAttribute("popover")).toBe(false);

    view.unmount();
    // Nothing left to hide; must not throw on the way out.
    expect(api.hide).toHaveBeenCalledTimes(0);
  });

  it("puts the later of two surfaces on top", () => {
    const api = installPopover();
    const view = mount(
      <FullScreen fullScreen data-testid="outer">
        <FullScreen fullScreen data-testid="inner">
          x
        </FullScreen>
      </FullScreen>,
    );
    const outer = view.host.querySelector('[data-testid="outer"]')!;
    const inner = view.host.querySelector('[data-testid="inner"]')!;
    // The top layer stacks in show order, so the LAST show is what counts.
    // React runs the inner surface's layout effect first, so without a
    // re-raise the outer one is shown last and buries it.
    const shows = api.show.mock.contexts;
    expect(shows.lastIndexOf(inner)).toBeGreaterThan(shows.lastIndexOf(outer));
    expect(shows.lastIndexOf(outer)).toBeGreaterThanOrEqual(0);
    expect(api.isOpen(inner) && api.isOpen(outer)).toBe(true);
    view.unmount();
  });
});

describe("FullScreen native mode — top layer interplay", () => {
  type FsDoc = Document & { fullscreenElement: Element | null; exitFullscreen: () => Promise<void> };

  function installFullscreen(reject: boolean) {
    const doc = document as FsDoc;
    let current: Element | null = null;
    Object.defineProperty(doc, "fullscreenElement", { configurable: true, get: () => current });
    Object.defineProperty(doc, "fullscreenEnabled", { configurable: true, value: true });
    doc.exitFullscreen = vi.fn(() => {
      current = null;
      doc.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    const request = vi.fn(function (this: HTMLElement) {
      // Chromium: "The element is already open as a Popover, and therefore
      // cannot be opened via the fullscreen API."
      if (this.hasAttribute("popover")) return Promise.reject(new TypeError("already open as a Popover"));
      if (reject) return Promise.reject(new TypeError("Permissions check failed"));
      current = this;
      doc.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    (HTMLElement.prototype as unknown as { requestFullscreen: unknown }).requestFullscreen = request;
    return { request };
  }

  afterEach(() => {
    delete (HTMLElement.prototype as unknown as { requestFullscreen?: unknown }).requestFullscreen;
    delete (document as unknown as { fullscreenElement?: unknown }).fullscreenElement;
    delete (document as unknown as { fullscreenEnabled?: unknown }).fullscreenEnabled;
    delete (document as unknown as { exitFullscreen?: unknown }).exitFullscreen;
  });

  it("requests the browser full screen BEFORE any popover, since Chromium refuses an open popover", async () => {
    const api = installPopover();
    const fs = installFullscreen(false);
    const view = mount(<FullScreen mode="native" fullScreen>x</FullScreen>);
    await act(async () => {});

    expect(fs.request).toHaveBeenCalledTimes(1);
    expect(api.show).not.toHaveBeenCalled();
    expect(view.target().getAttribute("data-fullscreen-mode")).toBe("native");
    expect(view.target().getAttribute("data-fullscreen-layer")).toBe("top");
    view.unmount();
  });

  it("promotes to the top layer when the browser refuses", async () => {
    const api = installPopover();
    installFullscreen(true);
    const view = mount(<FullScreen mode="native" fullScreen>x</FullScreen>);
    await act(async () => {});

    expect(view.target().getAttribute("data-fullscreen-mode")).toBe("overlay");
    expect(api.show).toHaveBeenCalledTimes(1);
    expect(view.target().getAttribute("popover")).toBe("manual");
    expect(view.target().getAttribute("data-fullscreen-layer")).toBe("top");

    view.rerender(<FullScreen mode="native" fullScreen={false}>x</FullScreen>);
    expect(api.hide).toHaveBeenCalledTimes(1);
    expect(view.target().hasAttribute("popover")).toBe(false);
    view.unmount();
  });
});

describe("FullScreen top layer — server render and hydration", () => {
  it("has no popover attribute in server HTML, and hydrates without a mismatch", () => {
    const html = renderToString(<FullScreen defaultFullScreen>x</FullScreen>);
    expect(html).not.toContain("popover");
    expect(html).toContain('data-fullscreen-layer="fixed"');

    const api = installPopover();
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.append(host);
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    act(() => {
      root = hydrateRoot(host, <FullScreen defaultFullScreen>x</FullScreen>, {
        onRecoverableError: (e) => errors.push(e),
      });
    });
    expect(errors).toEqual([]);

    const surface = host.querySelector<HTMLElement>("[data-react-fancy-fullscreen]")!;
    expect(api.isOpen(surface)).toBe(true);
    expect(surface.getAttribute("data-fullscreen-layer")).toBe("top");
    act(() => root!.unmount());
  });
});

describe("FullScreen top layer — UA popover styles", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("resets the UA popover box in a layered, zero-specificity rule", () => {
    // UA [popover] gives padding .25em, a solid border, Canvas/CanvasText and
    // overflow:auto. Any AUTHOR rule beats the UA origin, so a :where() rule in
    // the base layer neutralises them while every utility a consumer passes
    // through className still wins. Inline styles would beat those utilities.
    const m = css.match(/@layer base\s*\{[^{}]*:where\(\[data-fullscreen-layer="top"\]\)\s*\{([^}]*)\}/);
    expect(m, "rule inside @layer base").not.toBeNull();
    const body = m![1];
    for (const decl of [/padding:\s*0/, /border:\s*0/, /background-color:\s*transparent/, /color:\s*inherit/, /overflow:\s*visible/]) {
      expect(body).toMatch(decl);
    }
  });
});

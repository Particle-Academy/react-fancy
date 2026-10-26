// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FullScreen, useFullScreen } from "../src/components/FullScreen";
import { Portal } from "../src/components/Portal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function pressEscape(on: Element | Document = document.activeElement ?? document.body) {
  act(() => {
    on.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  });
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("FullScreen — state", () => {
  it("is uncontrolled by default and the toggle flips it", () => {
    const view = mount(
      <FullScreen>
        <FullScreen.Toggle />
        <p>body</p>
      </FullScreen>,
    );

    expect(view.target().getAttribute("data-fullscreen")).toBe("false");
    act(() => view.toggle().click());
    expect(view.target().getAttribute("data-fullscreen")).toBe("true");
    act(() => view.toggle().click());
    expect(view.target().getAttribute("data-fullscreen")).toBe("false");
    view.unmount();
  });

  it("honours defaultFullScreen", () => {
    const view = mount(<FullScreen defaultFullScreen>x</FullScreen>);
    expect(view.target().getAttribute("data-fullscreen")).toBe("true");
    view.unmount();
  });

  it("is controlled by `fullScreen` and reports intent through onFullScreenChange", () => {
    const onChange = vi.fn();
    const view = mount(
      <FullScreen fullScreen={false} onFullScreenChange={onChange}>
        <FullScreen.Toggle />
      </FullScreen>,
    );

    act(() => view.toggle().click());
    expect(onChange).toHaveBeenCalledWith(true);
    // A controlled parent that ignores the request keeps it where it is.
    expect(view.target().getAttribute("data-fullscreen")).toBe("false");

    view.rerender(
      <FullScreen fullScreen onFullScreenChange={onChange}>
        <FullScreen.Toggle />
      </FullScreen>,
    );
    expect(view.target().getAttribute("data-fullscreen")).toBe("true");
    view.unmount();
  });

  it("covers the viewport with a fixed overlay while active, and only then", () => {
    const view = mount(<FullScreen className="rounded-xl">x</FullScreen>);
    expect(view.target().style.position).toBe("");

    view.rerender(<FullScreen fullScreen className="rounded-xl">x</FullScreen>);
    const s = view.target().style;
    expect(s.position).toBe("fixed");
    expect(s.top).toBe("0px");
    expect(s.left).toBe("0px");
    expect(s.width).toBe("100%");
    expect(s.height).toBe("100%");
    expect(view.target().getAttribute("data-fullscreen-mode")).toBe("overlay");
    view.unmount();
  });
});

describe("FullScreen — stable handles", () => {
  it("marks the target and the toggle", () => {
    const view = mount(
      <FullScreen>
        <FullScreen.Toggle />
      </FullScreen>,
    );
    const toggle = view.toggle();
    expect(view.target()).not.toBeNull();
    expect(toggle.getAttribute("type")).toBe("button");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.getAttribute("data-fullscreen")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("Enter full screen");

    act(() => toggle.click());
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.getAttribute("data-fullscreen")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Exit full screen");
    view.unmount();
  });
});

describe("FullScreen — Escape", () => {
  it("exits on Escape pressed inside", () => {
    const onChange = vi.fn();
    const view = mount(
      <FullScreen defaultFullScreen onFullScreenChange={onChange}>
        <input data-testid="field" />
      </FullScreen>,
    );
    const field = view.host.querySelector("input")!;
    act(() => field.focus());
    pressEscape(field);

    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(view.target().getAttribute("data-fullscreen")).toBe("false");
    view.unmount();
  });

  it("exits on Escape when nothing is focused", () => {
    const view = mount(<FullScreen defaultFullScreen>x</FullScreen>);
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    pressEscape(document.body);
    expect(view.target().getAttribute("data-fullscreen")).toBe("false");
    view.unmount();
  });

  it("does not let the Escape reach an enclosing dialog's document listener", () => {
    // MOIC embeds editors in dialogs. Escape should leave full screen, not ALSO
    // close the dialog the editor lives in.
    const dialogClose = vi.fn();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") dialogClose();
    };
    document.addEventListener("keydown", listener);

    const view = mount(
      <FullScreen defaultFullScreen>
        <input />
      </FullScreen>,
    );
    const field = view.host.querySelector("input")!;
    act(() => field.focus());
    pressEscape(field);

    expect(view.target().getAttribute("data-fullscreen")).toBe("false");
    expect(dialogClose).not.toHaveBeenCalled();
    document.removeEventListener("keydown", listener);
    view.unmount();
  });

  it("leaves an Escape that a child already handled alone", () => {
    const view = mount(
      <FullScreen defaultFullScreen>
        <input onKeyDown={(e) => e.key === "Escape" && e.preventDefault()} />
      </FullScreen>,
    );
    const field = view.host.querySelector("input")!;
    act(() => field.focus());
    pressEscape(field);
    expect(view.target().getAttribute("data-fullscreen")).toBe("true");
    view.unmount();
  });

  it("can be told not to exit on Escape", () => {
    const view = mount(
      <FullScreen defaultFullScreen closeOnEscape={false}>
        <input />
      </FullScreen>,
    );
    const field = view.host.querySelector("input")!;
    act(() => field.focus());
    pressEscape(field);
    expect(view.target().getAttribute("data-fullscreen")).toBe("true");
    view.unmount();
  });
});

describe("FullScreen — focus", () => {
  it("returns focus to the element that was focused before entering", () => {
    const outside = document.createElement("button");
    outside.textContent = "outside";
    document.body.append(outside);

    function Harness() {
      const [on, setOn] = useState(false);
      return (
        <>
          <button data-testid="opener" onClick={() => setOn(true)}>
            open
          </button>
          <FullScreen fullScreen={on} onFullScreenChange={setOn}>
            <input />
          </FullScreen>
        </>
      );
    }

    const view = mount(<Harness />);
    const opener = view.host.querySelector<HTMLButtonElement>('[data-testid="opener"]')!;
    act(() => opener.focus());
    act(() => opener.click());

    // Focus moved INTO the full-screen surface, not left behind it.
    expect(view.target().contains(document.activeElement)).toBe(true);

    pressEscape(document.activeElement!);
    expect(document.activeElement).toBe(opener);
    view.unmount();
  });

  it("returns focus to the toggle used to enter", () => {
    const view = mount(
      <FullScreen>
        <FullScreen.Toggle />
        <input />
      </FullScreen>,
    );
    const toggle = view.toggle();
    act(() => toggle.focus());
    act(() => toggle.click());
    const field = view.host.querySelector("input")!;
    act(() => field.focus());
    pressEscape(field);
    expect(document.activeElement).toBe(toggle);
    view.unmount();
  });
});

describe("FullScreen — scroll", () => {
  it("locks body scroll while active and releases it on exit", () => {
    document.body.style.overflow = "scroll";
    const view = mount(<FullScreen>x</FullScreen>);
    expect(document.body.style.overflow).toBe("scroll");

    view.rerender(<FullScreen fullScreen>x</FullScreen>);
    expect(document.body.style.overflow).toBe("hidden");

    view.rerender(<FullScreen fullScreen={false}>x</FullScreen>);
    expect(document.body.style.overflow).toBe("scroll");
    view.unmount();
  });

  it("releases the lock when unmounted while active", () => {
    const view = mount(<FullScreen fullScreen>x</FullScreen>);
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps the lock until the LAST of two active surfaces exits", () => {
    const view = mount(
      <>
        <FullScreen fullScreen>a</FullScreen>
        <FullScreen fullScreen>b</FullScreen>
      </>,
    );
    view.rerender(
      <>
        <FullScreen fullScreen={false}>a</FullScreen>
        <FullScreen fullScreen>b</FullScreen>
      </>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores the window scroll position on exit", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", { configurable: true, value: 420 });
    Object.defineProperty(window, "scrollX", { configurable: true, value: 0 });

    const view = mount(<FullScreen fullScreen>x</FullScreen>);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    view.rerender(<FullScreen fullScreen={false}>x</FullScreen>);

    expect(scrollTo).toHaveBeenCalledWith(0, 420);
    scrollTo.mockRestore();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    view.unmount();
  });

  it("restores a scrolled ancestor panel on exit", () => {
    // Taking the surface out of flow shrinks the panel around it, which clamps
    // the panel's scrollTop. Without a restore the user lands somewhere else.
    function Panel({ on }: { on: boolean }) {
      return (
        <div data-testid="panel" style={{ overflow: "auto", height: 100 }}>
          <FullScreen fullScreen={on}>x</FullScreen>
        </div>
      );
    }
    const view = mount(<Panel on={false} />);
    const panel = view.host.querySelector<HTMLElement>('[data-testid="panel"]')!;
    const surface = view.target();

    // Model the browser: once the surface is out of flow the panel is shorter,
    // and the first layout read clamps its scrollTop for good. jsdom does no
    // layout, so without this the test cannot see a memo taken too late (it
    // passed here while a real Chromium lost 569 -> 342).
    let stored = 0;
    Object.defineProperty(panel, "scrollTop", {
      configurable: true,
      get: () => {
        if (surface.style.position === "fixed") stored = Math.min(stored, 100);
        return stored;
      },
      set: (v: number) => {
        stored = v;
      },
    });
    panel.scrollTop = 250;

    view.rerender(<Panel on />);
    expect(panel.scrollTop).toBe(100); // clamped while the surface is out
    view.rerender(<Panel on={false} />);

    expect(panel.scrollTop).toBe(250);
    view.unmount();
  });
});

describe("FullScreen — native mode", () => {
  type FsDoc = Document & { fullscreenElement: Element | null; exitFullscreen: () => Promise<void> };

  function installFullscreenApi(reject: boolean) {
    const doc = document as FsDoc;
    let current: Element | null = null;
    Object.defineProperty(doc, "fullscreenElement", { configurable: true, get: () => current });
    Object.defineProperty(doc, "fullscreenEnabled", { configurable: true, value: true });
    doc.exitFullscreen = vi.fn(() => {
      current = null;
      doc.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    const request = vi.fn(function (this: Element) {
      if (reject) return Promise.reject(new TypeError("Permissions check failed"));
      current = this;
      doc.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    (HTMLElement.prototype as unknown as { requestFullscreen: unknown }).requestFullscreen = request;
    return {
      request,
      /** The user pressing Esc in the browser's own full-screen UI. */
      userExits() {
        current = null;
        act(() => {
          doc.dispatchEvent(new Event("fullscreenchange"));
        });
      },
    };
  }

  afterEach(() => {
    delete (HTMLElement.prototype as unknown as { requestFullscreen?: unknown }).requestFullscreen;
    delete (document as unknown as { fullscreenElement?: unknown }).fullscreenElement;
    delete (document as unknown as { fullscreenEnabled?: unknown }).fullscreenEnabled;
    delete (document as unknown as { exitFullscreen?: unknown }).exitFullscreen;
  });

  it("requests the browser's full screen and reports native mode", async () => {
    const api = installFullscreenApi(false);
    const view = mount(<FullScreen mode="native">x</FullScreen>);
    view.rerender(<FullScreen mode="native" fullScreen>x</FullScreen>);
    await act(async () => {});

    expect(api.request).toHaveBeenCalledTimes(1);
    expect(view.target().getAttribute("data-fullscreen-mode")).toBe("native");
    view.unmount();
  });

  it("falls back to the overlay when the request is rejected (iframe, dialog, no gesture)", async () => {
    installFullscreenApi(true);
    const onChange = vi.fn();
    const view = mount(
      <FullScreen mode="native" defaultFullScreen onFullScreenChange={onChange}>
        x
      </FullScreen>,
    );
    await act(async () => {});

    expect(view.target().getAttribute("data-fullscreen")).toBe("true");
    expect(view.target().getAttribute("data-fullscreen-mode")).toBe("overlay");
    expect(view.target().style.position).toBe("fixed");
    expect(onChange).not.toHaveBeenCalled();
    view.unmount();
  });

  it("falls back to the overlay when the API does not exist", async () => {
    const view = mount(<FullScreen mode="native" defaultFullScreen>x</FullScreen>);
    await act(async () => {});
    expect(view.target().getAttribute("data-fullscreen-mode")).toBe("overlay");
    view.unmount();
  });

  it("syncs controlled state when the user leaves through the browser UI", async () => {
    const api = installFullscreenApi(false);
    const onChange = vi.fn();
    const view = mount(
      <FullScreen mode="native" defaultFullScreen onFullScreenChange={onChange}>
        x
      </FullScreen>,
    );
    await act(async () => {});
    expect(view.target().getAttribute("data-fullscreen-mode")).toBe("native");

    api.userExits();
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(view.target().getAttribute("data-fullscreen")).toBe("false");
    view.unmount();
  });

  it("leaves the browser's full screen when the state goes false", async () => {
    installFullscreenApi(false);
    const view = mount(<FullScreen mode="native" fullScreen>x</FullScreen>);
    await act(async () => {});
    view.rerender(<FullScreen mode="native" fullScreen={false}>x</FullScreen>);
    expect((document as FsDoc).exitFullscreen).toHaveBeenCalled();
    view.unmount();
  });
});

describe("FullScreen — portals", () => {
  it("renders a descendant Portal INSIDE the surface while active", () => {
    // In the browser's full screen only the full-screen element's subtree is
    // painted, so a menu portalled to <body> would be invisible.
    const view = mount(
      <FullScreen fullScreen>
        <Portal>
          <div data-testid="menu">menu</div>
        </Portal>
      </FullScreen>,
    );
    const menu = document.querySelector('[data-testid="menu"]');
    expect(menu).not.toBeNull();
    expect(view.target().contains(menu)).toBe(true);
    view.unmount();
  });

  it("leaves Portals on <body> while inactive", () => {
    const view = mount(
      <FullScreen>
        <Portal>
          <div data-testid="menu">menu</div>
        </Portal>
      </FullScreen>,
    );
    const menu = document.querySelector('[data-testid="menu"]');
    expect(menu).not.toBeNull();
    expect(view.target().contains(menu)).toBe(false);
    view.unmount();
  });
});

describe("useFullScreen — hook for surfaces that own their root", () => {
  it("returns target props a custom root can spread", () => {
    function Surface() {
      const fs = useFullScreen<HTMLElement>({ defaultFullScreen: false });
      return (
        <section data-testid="root" {...fs.targetProps}>
          <button {...fs.toggleProps}>toggle</button>
        </section>
      );
    }
    const view = mount(<Surface />);
    const root = view.host.querySelector<HTMLElement>('[data-testid="root"]')!;
    expect(root.getAttribute("data-fullscreen")).toBe("false");
    act(() => view.toggle().click());
    expect(root.getAttribute("data-fullscreen")).toBe("true");
    expect(root.style.position).toBe("fixed");
    view.unmount();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Drawer } from "../src/components/Drawer";

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
  };
}

const noop = () => {};

/** The panel itself, wherever it landed — portalled or in place. */
const panel = () => document.querySelector<HTMLDivElement>("[data-react-fancy-drawer]");
const backdrop = () => document.querySelector<HTMLDivElement>("[data-react-fancy-drawer-backdrop]");

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("Drawer — mounting", () => {
  it("renders nothing while closed", () => {
    mount(
      <Drawer open={false} onClose={noop}>
        <Drawer.Body>hidden</Drawer.Body>
      </Drawer>,
    );
    expect(panel()).toBeNull();
  });

  it("renders the panel and its slots when open", () => {
    mount(
      <Drawer open onClose={noop}>
        <Drawer.Header>Title</Drawer.Header>
        <Drawer.Body>Content</Drawer.Body>
        <Drawer.Footer>Actions</Drawer.Footer>
      </Drawer>,
    );
    expect(panel()).not.toBeNull();
    expect(document.querySelector("[data-react-fancy-drawer-header]")?.textContent).toContain("Title");
    expect(document.querySelector("[data-react-fancy-drawer-body]")?.textContent).toContain("Content");
    expect(document.querySelector("[data-react-fancy-drawer-footer]")?.textContent).toContain("Actions");
  });
});

describe("Drawer — sides", () => {
  const cases = [
    ["left", "left-0", "fancy-slide-in-left"],
    ["right", "right-0", "fancy-slide-in-right"],
    ["top", "top-0", "fancy-slide-in-top"],
    ["bottom", "bottom-0", "fancy-slide-in-bottom"],
  ] as const;

  for (const [side, anchor, anim] of cases) {
    it(`anchors and animates from ${side}`, () => {
      mount(
        <Drawer open onClose={noop} side={side}>
          <Drawer.Body>x</Drawer.Body>
        </Drawer>,
      );
      const el = panel()!;
      expect(el.dataset.side).toBe(side);
      expect(el.className).toContain(anchor);
      expect(el.className).toContain(anim);
    });
  }
});

describe("Drawer — size addresses the drawer's own axis", () => {
  // The subtle part of the API: one scale, two meanings. A regression here is
  // invisible in a snapshot but makes `size` do nothing on two of four sides.
  it("uses width on the horizontal edges", () => {
    mount(
      <Drawer open onClose={noop} side="right" size="lg">
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    expect(panel()!.className).toContain("w-96");
    expect(panel()!.className).toContain("h-full");
  });

  it("uses height on the vertical edges", () => {
    mount(
      <Drawer open onClose={noop} side="bottom" size="lg">
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    expect(panel()!.className).toContain("h-96");
    expect(panel()!.className).toContain("w-full");
  });
});

describe("Drawer — attach", () => {
  it("portals out of the tree and fixes to the viewport by default", () => {
    const view = mount(
      <div>
        <Drawer open onClose={noop}>
          <Drawer.Body>x</Drawer.Body>
        </Drawer>
      </div>,
    );
    const frame = document.querySelector<HTMLDivElement>("[data-react-fancy-drawer-frame]")!;
    expect(frame.className).toContain("fixed");
    // It left the host subtree entirely.
    expect(view.host.contains(frame)).toBe(false);
  });

  it("stays inside its container when attached", () => {
    const view = mount(
      <Drawer.Container>
        <Drawer open onClose={noop} attach="container" side="bottom">
          <Drawer.Body>x</Drawer.Body>
        </Drawer>
      </Drawer.Container>,
    );
    const frame = document.querySelector<HTMLDivElement>("[data-react-fancy-drawer-frame]")!;
    expect(frame.className).toContain("absolute");
    expect(frame.className).not.toContain("fixed");
    expect(view.host.contains(frame)).toBe(true);

    const container = view.host.querySelector<HTMLDivElement>("[data-react-fancy-drawer-container]")!;
    // Without `relative` on the anchor, an absolute drawer escapes to the
    // viewport — which is exactly the bug Container exists to prevent.
    expect(container.className).toContain("relative");
    expect(container.className).toContain("overflow-hidden");
  });

  it("locks body scroll only for the viewport form", () => {
    const attached = mount(
      <Drawer.Container>
        <Drawer open onClose={noop} attach="container">
          <Drawer.Body>x</Drawer.Body>
        </Drawer>
      </Drawer.Container>,
    );
    expect(document.body.style.overflow).toBe("");
    attached.unmount();

    mount(
      <Drawer open onClose={noop}>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("is only aria-modal when it is actually modal", () => {
    const attached = mount(
      <Drawer.Container>
        <Drawer open onClose={noop} attach="container">
          <Drawer.Body>x</Drawer.Body>
        </Drawer>
      </Drawer.Container>,
    );
    expect(panel()!.getAttribute("aria-modal")).toBeNull();
    attached.unmount();

    mount(
      <Drawer open onClose={noop}>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    expect(panel()!.getAttribute("aria-modal")).toBe("true");
  });
});

describe("Drawer — dismissal", () => {
  it("closes on Escape, and respects dismissOnEscape={false}", () => {
    let closed = 0;
    const view = mount(
      <Drawer open onClose={() => closed++}>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(closed).toBe(1);

    view.rerender(
      <Drawer open onClose={() => closed++} dismissOnEscape={false}>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(closed).toBe(1);
  });

  it("closes on backdrop click, and respects dismissOnBackdrop={false}", () => {
    let closed = 0;
    const view = mount(
      <Drawer open onClose={() => closed++}>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    act(() => {
      backdrop()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(closed).toBe(1);

    view.rerender(
      <Drawer open onClose={() => closed++} dismissOnBackdrop={false}>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    act(() => {
      backdrop()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(closed).toBe(1);
  });

  it("closes from the header button", () => {
    let closed = 0;
    mount(
      <Drawer open onClose={() => closed++}>
        <Drawer.Header>Title</Drawer.Header>
      </Drawer>,
    );
    const button = document.querySelector<HTMLButtonElement>("[data-react-fancy-drawer-header] button")!;
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(closed).toBe(1);
  });

  it("omits the backdrop when asked", () => {
    mount(
      <Drawer open onClose={noop} backdrop={false}>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    expect(backdrop()).toBeNull();
    // A backdrop-less drawer must not swallow clicks on the page behind it.
    expect(document.querySelector("[data-react-fancy-drawer-frame]")!.className).toContain("pointer-events-none");
    expect(panel()!.className).toContain("pointer-events-auto");
  });
});

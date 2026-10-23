// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { ResizablePanels } from "../src/components/ResizablePanels";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * ResizablePanels — the W3C window-splitter pattern
 * (https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/).
 *
 * `value` is the PRIMARY (first) panel's size as a percentage of the container.
 * `orientation` names how the PANELS are laid out: "horizontal" is side by side,
 * which makes the separator itself a vertical bar (aria-orientation="vertical")
 * moved with Left/Right; "vertical" stacks them, a horizontal bar moved with
 * Up/Down.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const sep = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-resizable-panels-separator]")!;
const rootEl = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-resizable-panels]")!;
const panels = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("[data-react-fancy-resizable-panels-panel]")];
const now = (host: HTMLElement) => Number(sep(host).getAttribute("aria-valuenow"));

function key(el: HTMLElement, k: string, opts: KeyboardEventInit = {}) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts }));
  });
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true, cancelable: true, ...opts }));
  });
}

function pointer(el: HTMLElement, type: string, init: { clientX?: number; clientY?: number; pointerId?: number }) {
  const Ctor = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  const ev = new Ctor(type, { bubbles: true, cancelable: true, clientX: init.clientX ?? 0, clientY: init.clientY ?? 0, button: 0 });
  if (!("pointerId" in ev) || (ev as PointerEvent).pointerId !== (init.pointerId ?? 1)) {
    Object.defineProperty(ev, "pointerId", { value: init.pointerId ?? 1 });
  }
  act(() => {
    el.dispatchEvent(ev);
  });
}

/** Container occupies x 100..500 (400 wide), y 0..200 (200 tall). */
function mockRect(el: HTMLElement) {
  el.getBoundingClientRect = () =>
    ({ left: 100, top: 0, right: 500, bottom: 200, width: 400, height: 200, x: 100, y: 0, toJSON() {} }) as DOMRect;
}

beforeEach(() => {
  // jsdom implements neither; the component must call them when present.
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => true);
});

afterEach(() => vi.restoreAllMocks());

const two = [<div key="a">Primary</div>, <div key="b">Secondary</div>];

describe("ResizablePanels — structure and ARIA", () => {
  it("renders two panels and a separator with the window-splitter attributes", () => {
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={40} min={20} max={80} label="Resize sidebar">
        {two}
      </ResizablePanels>,
    );

    const s = sep(host);
    const [first, second] = panels(host);
    expect(rootEl(host)).not.toBeNull();
    expect(first.getAttribute("data-react-fancy-resizable-panels-panel")).toBe("first");
    expect(second.getAttribute("data-react-fancy-resizable-panels-panel")).toBe("second");
    expect(first.textContent).toBe("Primary");
    expect(second.textContent).toBe("Secondary");

    expect(s.getAttribute("role")).toBe("separator");
    expect(s.tabIndex).toBe(0);
    expect(s.getAttribute("aria-label")).toBe("Resize sidebar");
    expect(s.getAttribute("aria-valuenow")).toBe("40");
    expect(s.getAttribute("aria-valuemin")).toBe("20");
    expect(s.getAttribute("aria-valuemax")).toBe("80");
    expect(first.id).toBeTruthy();
    expect(s.getAttribute("aria-controls")).toBe(first.id);
    unmount();
  });

  it("side-by-side panels have a vertical separator; stacked panels a horizontal one", () => {
    const a = mount(<ResizablePanels>{two}</ResizablePanels>);
    expect(sep(a.host).getAttribute("aria-orientation")).toBe("vertical");
    expect(rootEl(a.host).getAttribute("data-orientation")).toBe("horizontal");
    a.unmount();

    const b = mount(<ResizablePanels orientation="vertical">{two}</ResizablePanels>);
    expect(sep(b.host).getAttribute("aria-orientation")).toBe("horizontal");
    expect(rootEl(b.host).getAttribute("data-orientation")).toBe("vertical");
    b.unmount();
  });

  it("sizes the primary panel from the value", () => {
    const { host, unmount } = mount(<ResizablePanels defaultValue={30}>{two}</ResizablePanels>);
    expect(panels(host)[0].style.flexBasis).toBe("30%");
    unmount();
  });

  it("passes data-* handles and className through to the root", () => {
    const { host, unmount } = mount(
      <ResizablePanels data-handle="split" className="h-96">
        {two}
      </ResizablePanels>,
    );
    expect(host.querySelector('[data-handle="split"]')).toBe(rootEl(host));
    expect(rootEl(host).className).toContain("h-96");
    unmount();
  });

  it("has a visible, token-driven focus ring", () => {
    const { host, unmount } = mount(<ResizablePanels>{two}</ResizablePanels>);
    const cls = sep(host).className;
    expect(cls).toContain("focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))]");
    expect(cls).toContain("dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]");
    unmount();
  });
});

describe("ResizablePanels — keyboard", () => {
  it("Left/Right move a vertical separator by step; Shift by largeStep", () => {
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={50} step={5} largeStep={20}>
        {two}
      </ResizablePanels>,
    );
    const s = sep(host);
    key(s, "ArrowRight");
    expect(now(host)).toBe(55);
    key(s, "ArrowLeft");
    key(s, "ArrowLeft");
    expect(now(host)).toBe(45);
    key(s, "ArrowRight", { shiftKey: true });
    expect(now(host)).toBe(65);
    // Up/Down belong to the other orientation and do nothing here.
    key(s, "ArrowUp");
    key(s, "ArrowDown");
    expect(now(host)).toBe(65);
    unmount();
  });

  it("Up/Down move a horizontal separator", () => {
    const { host, unmount } = mount(
      <ResizablePanels orientation="vertical" defaultValue={50} step={10}>
        {two}
      </ResizablePanels>,
    );
    const s = sep(host);
    key(s, "ArrowDown");
    expect(now(host)).toBe(60);
    key(s, "ArrowUp");
    key(s, "ArrowUp");
    expect(now(host)).toBe(40);
    key(s, "ArrowLeft");
    expect(now(host)).toBe(40);
    unmount();
  });

  it("Home and End go to min and max", () => {
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={50} min={15} max={70}>
        {two}
      </ResizablePanels>,
    );
    key(sep(host), "End");
    expect(now(host)).toBe(70);
    key(sep(host), "Home");
    expect(now(host)).toBe(15);
    unmount();
  });

  it("clamps keyboard moves to min/max", () => {
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={75} min={10} max={80} step={10}>
        {two}
      </ResizablePanels>,
    );
    key(sep(host), "ArrowRight");
    expect(now(host)).toBe(80);
    key(sep(host), "ArrowRight", { shiftKey: true });
    expect(now(host)).toBe(80);
    unmount();
  });

  it("clamps an out-of-range value prop, and never past the container", () => {
    const a = mount(
      <ResizablePanels value={95} min={10} max={80}>
        {two}
      </ResizablePanels>,
    );
    expect(now(a.host)).toBe(80);
    a.unmount();

    const b = mount(
      <ResizablePanels defaultValue={150} min={-20} max={400}>
        {two}
      </ResizablePanels>,
    );
    expect(now(b.host)).toBe(100);
    expect(sep(b.host).getAttribute("aria-valuemin")).toBe("0");
    expect(sep(b.host).getAttribute("aria-valuemax")).toBe("100");
    b.unmount();
  });

  it("onValueCommit fires once per key release, with the new value", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={50} step={5} onValueChange={onValueChange} onValueCommit={onValueCommit}>
        {two}
      </ResizablePanels>,
    );
    const s = sep(host);
    // A held key: three repeats, one release.
    act(() => {
      for (let i = 0; i < 3; i++) s.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, repeat: i > 0 }));
    });
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual([55, 60, 65]);
    expect(onValueCommit).not.toHaveBeenCalled();
    act(() => {
      s.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
    });
    expect(onValueCommit).toHaveBeenCalledTimes(1);
    expect(onValueCommit).toHaveBeenCalledWith(65);

    // A key that changes nothing commits nothing.
    key(s, "a");
    expect(onValueCommit).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("disabled: not focusable, keys and pointer do nothing", () => {
    const onValueChange = vi.fn();
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={50} disabled onValueChange={onValueChange}>
        {two}
      </ResizablePanels>,
    );
    const s = sep(host);
    expect(s.tabIndex).toBe(-1);
    expect(s.getAttribute("aria-disabled")).toBe("true");
    key(s, "ArrowRight");
    mockRect(rootEl(host));
    pointer(s, "pointerdown", { clientX: 300 });
    pointer(s, "pointermove", { clientX: 400 });
    pointer(s, "pointerup", { clientX: 400 });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(now(host)).toBe(50);
    unmount();
  });
});

describe("ResizablePanels — controlled vs uncontrolled", () => {
  it("controlled: renders the prop, reports the request, and waits for the host", () => {
    const onValueChange = vi.fn();
    const { host, rerender, unmount } = mount(
      <ResizablePanels value={30} step={5} onValueChange={onValueChange}>
        {two}
      </ResizablePanels>,
    );
    key(sep(host), "ArrowRight");
    expect(onValueChange).toHaveBeenCalledWith(35);
    // The host did not accept it, so nothing moved.
    expect(now(host)).toBe(30);

    rerender(
      <ResizablePanels value={35} step={5} onValueChange={onValueChange}>
        {two}
      </ResizablePanels>,
    );
    expect(now(host)).toBe(35);
    expect(panels(host)[0].style.flexBasis).toBe("35%");
    unmount();
  });

  it("controlled round-trip through host state", () => {
    function Host() {
      const [v, setV] = useState(50);
      return (
        <ResizablePanels value={v} onValueChange={setV} step={10}>
          {two}
        </ResizablePanels>
      );
    }
    const { host, unmount } = mount(<Host />);
    key(sep(host), "ArrowLeft");
    expect(now(host)).toBe(40);
    unmount();
  });

  it("uncontrolled: defaults to 50 and owns its state", () => {
    const { host, unmount } = mount(<ResizablePanels>{two}</ResizablePanels>);
    expect(now(host)).toBe(50);
    key(sep(host), "End");
    expect(now(host)).toBe(Number(sep(host).getAttribute("aria-valuemax")));
    unmount();
  });
});

describe("ResizablePanels — pointer", () => {
  it("dragging moves the separator to the pointer, captured, and commits once", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={50} onValueChange={onValueChange} onValueCommit={onValueCommit}>
        {two}
      </ResizablePanels>,
    );
    mockRect(rootEl(host));
    const s = sep(host);

    pointer(s, "pointerdown", { clientX: 300, pointerId: 7 });
    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(7);
    expect(rootEl(host).hasAttribute("data-dragging")).toBe(true);

    pointer(s, "pointermove", { clientX: 200, pointerId: 7 }); // 100/400 = 25%
    expect(now(host)).toBe(25);
    pointer(s, "pointermove", { clientX: 260, pointerId: 7 }); // 160/400 = 40%
    expect(now(host)).toBe(40);
    expect(onValueCommit).not.toHaveBeenCalled();

    pointer(s, "pointerup", { clientX: 260, pointerId: 7 });
    expect(onValueCommit).toHaveBeenCalledTimes(1);
    expect(onValueCommit).toHaveBeenCalledWith(40);
    expect(rootEl(host).hasAttribute("data-dragging")).toBe(false);

    // After release, movement no longer resizes.
    pointer(s, "pointermove", { clientX: 450, pointerId: 7 });
    expect(now(host)).toBe(40);
    expect(onValueCommit).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual([25, 40]);
    unmount();
  });

  it("clamps a drag to min/max and to the container", () => {
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={50} min={20} max={70}>
        {two}
      </ResizablePanels>,
    );
    mockRect(rootEl(host));
    const s = sep(host);
    pointer(s, "pointerdown", { clientX: 300 });
    pointer(s, "pointermove", { clientX: 900 }); // far past the right edge
    expect(now(host)).toBe(70);
    pointer(s, "pointermove", { clientX: -500 }); // far past the left edge
    expect(now(host)).toBe(20);
    pointer(s, "pointerup", { clientX: -500 });
    unmount();
  });

  it("vertical orientation reads clientY against the height", () => {
    const { host, unmount } = mount(
      <ResizablePanels orientation="vertical" defaultValue={50}>
        {two}
      </ResizablePanels>,
    );
    mockRect(rootEl(host));
    const s = sep(host);
    pointer(s, "pointerdown", { clientY: 100 });
    pointer(s, "pointermove", { clientY: 150 }); // 150/200 = 75%
    expect(now(host)).toBe(75);
    pointer(s, "pointerup", { clientY: 150 });
    unmount();
  });

  it("a press without movement commits nothing", () => {
    const onValueCommit = vi.fn();
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={50} onValueCommit={onValueCommit}>
        {two}
      </ResizablePanels>,
    );
    mockRect(rootEl(host));
    const s = sep(host);
    pointer(s, "pointerdown", { clientX: 300 });
    pointer(s, "pointerup", { clientX: 300 });
    expect(onValueCommit).not.toHaveBeenCalled();
    unmount();
  });

  it("a cancelled pointer ends the drag and commits what was reached", () => {
    const onValueCommit = vi.fn();
    const { host, unmount } = mount(
      <ResizablePanels defaultValue={50} onValueCommit={onValueCommit}>
        {two}
      </ResizablePanels>,
    );
    mockRect(rootEl(host));
    const s = sep(host);
    pointer(s, "pointerdown", { clientX: 300 });
    pointer(s, "pointermove", { clientX: 340 }); // 60%
    pointer(s, "pointercancel", { clientX: 340 });
    expect(onValueCommit).toHaveBeenCalledTimes(1);
    expect(onValueCommit).toHaveBeenCalledWith(60);
    expect(rootEl(host).hasAttribute("data-dragging")).toBe(false);
    unmount();
  });
});

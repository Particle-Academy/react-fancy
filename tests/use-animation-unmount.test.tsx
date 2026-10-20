// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { useAnimation } from "../src/hooks/use-animation";
import { Drawer } from "../src/components/Drawer";
import { Modal } from "../src/components/Modal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

const noop = () => {};

/**
 * A closed overlay used to leave the DOM ONLY on `animationend`. With no
 * animation running — an app that does not load Fancy's stylesheet, or jsdom,
 * which never fires the event — the closed panel stayed mounted forever.
 * Genie's real-window CI caught its AgentInbox flyout (a Drawer) never closing.
 */
describe("useAnimation — unmounts on close even when nothing animates", () => {
  it("a closed Drawer leaves the DOM with no stylesheet loaded", () => {
    const view = mount(
      <Drawer open onClose={noop}>
        <Drawer.Body>flyout</Drawer.Body>
      </Drawer>,
    );
    expect(document.querySelector("[data-react-fancy-drawer]")).not.toBeNull();

    view.rerender(
      <Drawer open={false} onClose={noop}>
        <Drawer.Body>flyout</Drawer.Body>
      </Drawer>,
    );

    expect(document.querySelector("[data-react-fancy-drawer]")).toBeNull();
    expect(document.querySelector("[data-react-fancy-drawer-frame]")).toBeNull();
  });

  it("a closed Modal leaves the DOM with no stylesheet loaded", () => {
    const view = mount(
      <Modal open onClose={noop}>
        <Modal.Body>dialog</Modal.Body>
      </Modal>,
    );
    expect(document.querySelector("[data-react-fancy-modal]")).not.toBeNull();

    view.rerender(
      <Modal open={false} onClose={noop}>
        <Modal.Body>dialog</Modal.Body>
      </Modal>,
    );

    expect(document.querySelector("[data-react-fancy-modal]")).toBeNull();
  });
});

/** A bare consumer of the hook, so the animated case can be staged exactly. */
function Probe({ open }: { open: boolean }) {
  const { mounted, className, ref } = useAnimation({
    open,
    enterClass: "probe-in",
    exitClass: "probe-out",
  });
  if (!mounted) return null;
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      data-probe=""
      className={className}
    >
      <span data-probe-child="" />
    </div>
  );
}

/** Make the probe report a running 200ms exit animation, as a real stylesheet would. */
function animateProbe() {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, pseudo?: string | null) => {
    if (el instanceof HTMLElement && el.hasAttribute("data-probe")) {
      return {
        animationName: "probe-out",
        animationDuration: "0.2s",
        animationDelay: "0s",
        transitionDuration: "0s",
        transitionDelay: "0s",
      } as unknown as CSSStyleDeclaration;
    }
    return real(el, pseudo);
  });
}

const probe = () => document.querySelector<HTMLElement>("[data-probe]");

describe("useAnimation — still waits for an exit animation that IS running", () => {
  it("stays mounted until the panel's own animationend", () => {
    animateProbe();
    const view = mount(<Probe open />);
    view.rerender(<Probe open={false} />);

    expect(probe()).not.toBeNull();
    expect(probe()!.className).toBe("probe-out");

    act(() => {
      probe()!.dispatchEvent(new Event("animationend", { bubbles: true }));
    });
    expect(probe()).toBeNull();
  });

  it("ignores an animationend bubbling up from a child", () => {
    animateProbe();
    const view = mount(<Probe open />);
    view.rerender(<Probe open={false} />);

    act(() => {
      document
        .querySelector("[data-probe-child]")!
        .dispatchEvent(new Event("animationend", { bubbles: true }));
    });
    expect(probe()).not.toBeNull();
  });

  it("falls back to a timeout when animationend never arrives", () => {
    vi.useFakeTimers();
    animateProbe();
    const view = mount(<Probe open />);
    view.rerender(<Probe open={false} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(probe()).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(probe()).toBeNull();
  });

  it("reopening during the exit keeps it mounted and cancels the fallback", () => {
    vi.useFakeTimers();
    animateProbe();
    const view = mount(<Probe open />);
    view.rerender(<Probe open={false} />);
    view.rerender(<Probe open />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(probe()).not.toBeNull();
    expect(probe()!.className).toBe("probe-in");
  });
});

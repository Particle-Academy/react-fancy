// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FullScreen } from "../src/components/FullScreen";
import { Dropdown } from "../src/components/Dropdown";
import { Popover } from "../src/components/Popover";
import { Modal } from "../src/components/Modal";
import { Tooltip } from "../src/components/Tooltip";
import { Select } from "../src/components/inputs/Select/Select";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The innermost open layer owns Escape.
 *
 * Found in DeckEditor on 5.61.1: full screen, open the toolbar's Shape
 * Dropdown, press Escape, and full screen EXITS with the menu still open. Focus
 * is on the trigger, inside the surface, so the surface's own key handler sees
 * the Escape first; the Dropdown listens on `document`, later in the same
 * event, so `defaultPrevented` is still false when the surface asks. Any rule
 * that depends on which listener runs first breaks the moment one moves.
 *
 * So layers register while open, and Escape is routed to the innermost one:
 * every `useEscapeKey(handler, open)` call (Dropdown, Select, Popover,
 * ContextMenu, Command, Autocomplete, Modal, Drawer, Tooltip, ...) joins one
 * stack, and an active full-screen surface yields to any layer opened inside
 * it, however the listeners are ordered.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
    surface: () => host.querySelector<HTMLElement>("[data-react-fancy-fullscreen]")!,
  };
}

function escape(on: Element = document.activeElement ?? document.body) {
  act(() => {
    on.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  });
}

const menu = () => document.querySelector("[data-react-fancy-dropdown]");

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

function DropdownInSurface({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <FullScreen defaultFullScreen={fullScreen === undefined ? true : undefined} fullScreen={fullScreen}>
      <Dropdown>
        <Dropdown.Trigger>
          <button type="button" data-testid="trigger">
            Shape
          </button>
        </Dropdown.Trigger>
        <Dropdown.Items>
          <Dropdown.Item>Rectangle</Dropdown.Item>
        </Dropdown.Items>
      </Dropdown>
    </FullScreen>
  );
}

describe("Escape inside a full-screen surface", () => {
  it("closes an open Dropdown first and exits full screen on the second press (focus on the trigger)", () => {
    const view = mount(<DropdownInSurface />);
    const trigger = view.host.querySelector<HTMLButtonElement>('[data-testid="trigger"]')!;
    act(() => trigger.focus());
    act(() => trigger.click());
    expect(menu()).not.toBeNull();

    escape(trigger);
    expect(menu()).toBeNull();
    expect(view.surface().getAttribute("data-fullscreen")).toBe("true");
    expect(document.activeElement).toBe(trigger);

    escape(trigger);
    expect(view.surface().getAttribute("data-fullscreen")).toBe("false");
    view.unmount();
  });

  it("does the same with nothing focused", () => {
    const view = mount(<DropdownInSurface />);
    act(() => view.host.querySelector<HTMLButtonElement>('[data-testid="trigger"]')!.click());
    act(() => (document.activeElement as HTMLElement | null)?.blur());

    escape(document.body);
    expect(menu()).toBeNull();
    expect(view.surface().getAttribute("data-fullscreen")).toBe("true");

    escape(document.body);
    expect(view.surface().getAttribute("data-fullscreen")).toBe("false");
    view.unmount();
  });

  it("does not depend on what opened first: a menu open before the surface went full screen still wins", () => {
    // An agent sets fullScreen while a human has the menu open. A rule based
    // on the order layers opened would hand this Escape to the surface.
    const view = mount(<DropdownInSurface fullScreen={false} />);
    const trigger = view.host.querySelector<HTMLButtonElement>('[data-testid="trigger"]')!;
    act(() => trigger.focus());
    act(() => trigger.click());
    view.rerender(<DropdownInSurface fullScreen />);
    expect(menu()).not.toBeNull();

    // Controlled with no onChange: a wrongful exit would show as the request
    // being made, so watch for the menu and the surface separately.
    escape(trigger);
    expect(menu()).toBeNull();
    expect(view.surface().getAttribute("data-fullscreen")).toBe("true");
    view.unmount();
  });

  it("closes an open listbox Select first", () => {
    const onChange = vi.fn();
    const view = mount(
      <FullScreen defaultFullScreen onFullScreenChange={onChange}>
        <Select variant="listbox" list={["One", "Two"]} />
      </FullScreen>,
    );
    const trigger = view.host.querySelector<HTMLButtonElement>("[data-react-fancy-select]")!;
    act(() => trigger.focus());
    act(() => trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    escape(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).not.toHaveBeenCalled();

    escape(trigger);
    expect(onChange).toHaveBeenLastCalledWith(false);
    view.unmount();
  });

  it("closes an open Popover first", () => {
    const onChange = vi.fn();
    const view = mount(
      <FullScreen defaultFullScreen onFullScreenChange={onChange}>
        <Popover>
          <Popover.Trigger>
            <button type="button" data-testid="pop">
              Fill
            </button>
          </Popover.Trigger>
          <Popover.Content>
            <div data-testid="pop-content">colours</div>
          </Popover.Content>
        </Popover>
      </FullScreen>,
    );
    const trigger = view.host.querySelector<HTMLButtonElement>('[data-testid="pop"]')!;
    act(() => trigger.focus());
    act(() => trigger.click());
    expect(document.querySelector('[data-testid="pop-content"]')).not.toBeNull();

    escape(trigger);
    expect(document.querySelector('[data-testid="pop-content"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    escape(trigger);
    expect(onChange).toHaveBeenLastCalledWith(false);
    view.unmount();
  });

  it("dismisses a visible Tooltip first", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const view = mount(
      <FullScreen defaultFullScreen onFullScreenChange={onChange}>
        <Tooltip content="Insert shape" delay={0}>
          <button type="button" data-testid="tip">
            +
          </button>
        </Tooltip>
      </FullScreen>,
    );
    const trigger = view.host.querySelector<HTMLButtonElement>('[data-testid="tip"]')!;
    act(() => trigger.focus());
    act(() => {
      vi.runAllTimers();
    });
    expect(document.querySelector("[data-react-fancy-tooltip]")).not.toBeNull();

    escape(trigger);
    expect(document.querySelector("[data-react-fancy-tooltip]")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    escape(trigger);
    expect(onChange).toHaveBeenLastCalledWith(false);
    view.unmount();
  });

  it("closes a Modal opened from inside the surface before exiting", () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <FullScreen defaultFullScreen>
          <Modal open={open} onClose={() => setOpen(false)}>
            <Modal.Body>
              <button type="button">inside</button>
            </Modal.Body>
          </Modal>
        </FullScreen>
      );
    }
    const view = mount(<Harness />);
    expect(document.querySelector("[data-react-fancy-modal]")).not.toBeNull();

    escape();
    expect(document.querySelector("[data-react-fancy-modal]")).toBeNull();
    expect(view.surface().getAttribute("data-fullscreen")).toBe("true");
    view.unmount();
  });
});

describe("Escape with stacked layers outside full screen", () => {
  it("closes only a Dropdown open inside a Modal, then the Modal", () => {
    // The same rule outside full screen: both listened on document, so one
    // Escape closed the menu AND the dialog it was opened from.
    const onClose = vi.fn();
    const view = mount(
      <Modal open onClose={onClose}>
        <Modal.Body>
          <Dropdown>
            <Dropdown.Trigger>
              <button type="button" data-testid="trigger">
                More
              </button>
            </Dropdown.Trigger>
            <Dropdown.Items>
              <Dropdown.Item>Duplicate</Dropdown.Item>
            </Dropdown.Items>
          </Dropdown>
        </Modal.Body>
      </Modal>,
    );
    const trigger = document.querySelector<HTMLButtonElement>('[data-testid="trigger"]')!;
    act(() => trigger.click());
    expect(menu()).not.toBeNull();

    escape(trigger);
    expect(menu()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    escape(trigger);
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});

describe("FullScreen.Toggle colour", () => {
  it("carries the kit's icon-button text colour, light and dark", () => {
    const view = mount(
      <FullScreen>
        <FullScreen.Toggle />
      </FullScreen>,
    );
    const cls = view.host.querySelector("[data-react-fancy-fullscreen-toggle]")!.className;
    expect(cls).toContain("text-[color:var(--fancy-text-muted,var(--color-zinc-500))]");
    expect(cls).toContain("dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]");
    expect(cls).toContain("hover:text-[color:var(--fancy-text-soft,var(--color-zinc-700))]");
    expect(cls).toContain("dark:hover:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]");
    view.unmount();
  });

  it("lets a consumer text colour replace it", () => {
    const view = mount(
      <FullScreen>
        <FullScreen.Toggle className="text-red-600" />
      </FullScreen>,
    );
    const cls = view.host.querySelector("[data-react-fancy-fullscreen-toggle]")!.className.split(/\s+/);
    expect(cls).toContain("text-red-600");
    expect(cls).not.toContain("text-[color:var(--fancy-text-muted,var(--color-zinc-500))]");
    view.unmount();
  });
});

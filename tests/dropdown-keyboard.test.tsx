// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Dropdown } from "../src/components/Dropdown";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Keyboard access to a Dropdown, per the WAI-ARIA menu button pattern.
 *
 * Found building the showcase Features menu on 5.64.0: `DropdownItems`
 * attached its arrow-key listener in an effect that returned early while the
 * menu element did not exist yet (the menu mounts after `useAnimation` and
 * `Portal` each take a render), and the effect never re-ran, because nothing in
 * its dependency list changed once the element appeared. ArrowDown did nothing,
 * so no item of any Dropdown could be reached from the keyboard.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function key(k: string, on: Element = document.activeElement ?? document.body, init: KeyboardEventInit = {}) {
  let event!: KeyboardEvent;
  act(() => {
    event = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init });
    on.dispatchEvent(event);
  });
  return event;
}

const menu = () => document.querySelector<HTMLElement>("[data-react-fancy-dropdown]");
const focusedText = () => (document.activeElement as HTMLElement | null)?.textContent;

function Menu({ onSelect }: { onSelect?: (v: string) => void }) {
  return (
    <>
      <Dropdown>
        <Dropdown.Trigger>
          <button type="button" data-testid="trigger">
            Account
          </button>
        </Dropdown.Trigger>
        <Dropdown.Items>
          <Dropdown.Item onClick={() => onSelect?.("Profile")}>Profile</Dropdown.Item>
          <Dropdown.Item disabled>Billing</Dropdown.Item>
          <Dropdown.Item onClick={() => onSelect?.("Settings")}>Settings</Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item onClick={() => onSelect?.("Sign out")}>Sign out</Dropdown.Item>
        </Dropdown.Items>
      </Dropdown>
      <button type="button" data-testid="after">
        After
      </button>
    </>
  );
}

function trigger() {
  return document.querySelector<HTMLButtonElement>('[data-testid="trigger"]')!;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("Dropdown: opening from the trigger", () => {
  it("ArrowDown on the trigger opens the menu and focuses the first enabled item", () => {
    mount(<Menu />);
    act(() => trigger().focus());
    const event = key("ArrowDown");
    expect(menu()).not.toBeNull();
    expect(focusedText()).toBe("Profile");
    expect(event.defaultPrevented).toBe(true);
  });

  it("ArrowUp on the trigger opens the menu and focuses the last enabled item", () => {
    mount(<Menu />);
    act(() => trigger().focus());
    key("ArrowUp");
    expect(menu()).not.toBeNull();
    expect(focusedText()).toBe("Sign out");
  });

  it("Enter on a button trigger opens the menu and focuses the first item", () => {
    mount(<Menu />);
    act(() => trigger().focus());
    // A browser turns Enter on a <button> into a click; jsdom does not.
    const event = key("Enter");
    if (!event.defaultPrevented) act(() => trigger().click());
    expect(menu()).not.toBeNull();
    expect(focusedText()).toBe("Profile");
  });

  it("Space on a non-button trigger opens the menu and focuses the first item", () => {
    mount(
      <Dropdown>
        <Dropdown.Trigger>
          <span tabIndex={0} data-testid="avatar">
            GW
          </span>
        </Dropdown.Trigger>
        <Dropdown.Items>
          <Dropdown.Item>Profile</Dropdown.Item>
        </Dropdown.Items>
      </Dropdown>,
    );
    const avatar = document.querySelector<HTMLElement>('[data-testid="avatar"]')!;
    act(() => avatar.focus());
    key(" ");
    expect(menu()).not.toBeNull();
    expect(focusedText()).toBe("Profile");
  });

  it("a mouse click still opens the menu without moving focus off the trigger", () => {
    mount(<Menu />);
    act(() => trigger().focus());
    act(() => {
      trigger().dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    });
    expect(menu()).not.toBeNull();
    expect(document.activeElement).toBe(trigger());
    // ...and ArrowDown from the trigger then reaches the items.
    key("ArrowDown");
    expect(focusedText()).toBe("Profile");
  });
});

describe("Dropdown: moving inside the menu", () => {
  it("ArrowDown / ArrowUp move between items, skip disabled ones, and wrap", () => {
    mount(<Menu />);
    act(() => trigger().focus());
    key("ArrowDown");
    expect(focusedText()).toBe("Profile");
    key("ArrowDown");
    expect(focusedText()).toBe("Settings"); // Billing is disabled
    key("ArrowDown");
    expect(focusedText()).toBe("Sign out");
    key("ArrowDown");
    expect(focusedText()).toBe("Profile"); // wrapped
    key("ArrowUp");
    expect(focusedText()).toBe("Sign out"); // wrapped back
    key("ArrowUp");
    expect(focusedText()).toBe("Settings");
    key("ArrowUp");
    expect(focusedText()).toBe("Profile");
  });

  it("Home and End jump to the first and last enabled items", () => {
    mount(<Menu />);
    act(() => trigger().focus());
    key("ArrowDown");
    key("End");
    expect(focusedText()).toBe("Sign out");
    key("Home");
    expect(focusedText()).toBe("Profile");
  });

  it("typeahead focuses the next item starting with the typed character", () => {
    mount(<Menu />);
    act(() => trigger().focus());
    key("ArrowDown");
    key("s");
    expect(focusedText()).toBe("Settings");
    key("s");
    expect(focusedText()).toBe("Sign out");
    key("b"); // Billing is disabled: nothing to go to
    expect(focusedText()).toBe("Sign out");
  });

  it("an item activated from the keyboard runs onClick, closes, and returns focus to the trigger", () => {
    const onSelect = vi.fn();
    mount(<Menu onSelect={onSelect} />);
    act(() => trigger().focus());
    key("ArrowDown");
    key("ArrowDown");
    // Enter / Space on a focused <button> menuitem is a native click.
    act(() => (document.activeElement as HTMLElement).click());
    expect(onSelect).toHaveBeenCalledWith("Settings");
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});

describe("Dropdown: leaving the menu", () => {
  it("Escape closes the menu and returns focus to the trigger", () => {
    mount(<Menu />);
    act(() => trigger().focus());
    key("ArrowDown");
    key("ArrowDown");
    expect(focusedText()).toBe("Settings");
    key("Escape");
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("Tab closes the menu and hands focus back to the trigger's place in the tab order", () => {
    mount(<Menu />);
    // Opened by mouse and focused directly, so this test does not depend on
    // the arrow keys working: it is about Tab alone.
    act(() => trigger().click());
    const item = menu()!.querySelector<HTMLElement>('[role="menuitem"]')!;
    act(() => item.focus());
    expect(focusedText()).toBe("Profile");
    const event = key("Tab");
    expect(menu()).toBeNull();
    // Not prevented: the browser's own Tab then moves on from the trigger.
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });
});

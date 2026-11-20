// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Select } from "../src/components/inputs/Select";
import { Dropdown } from "../src/components/Dropdown";
import { ContextMenu } from "../src/components/ContextMenu";
import { Popover } from "../src/components/Popover";
import { PhoneInput } from "../src/components/PhoneInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Every component that portals a popup AND closes it with `useOutsideClick`
 * must treat the portalled popup as inside, or a mouse/touch press on an item
 * closes the popup on `mousedown` and the item's `click` never fires (the bug
 * Autocomplete had). This pins that for each of them, so a refactor that
 * points the guard at a wrapper instead of the popup fails here.
 */

afterEach(() => {
  document.body.innerHTML = "";
});

const unmounts: Array<() => void> = [];
afterEach(() => {
  while (unmounts.length) unmounts.pop()!();
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  unmounts.push(() => act(() => root.unmount()));
  return host;
}

const MOUSE = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
const TOUCH = ["touchstart", "pointerdown", "touchend", "pointerup", "mousedown", "mouseup", "click"];

function press(el: Element, sequence: string[]) {
  for (const name of sequence) {
    if (!el.isConnected) break;
    act(() => {
      const ev = name.startsWith("touch")
        ? new Event(name, { bubbles: true, cancelable: true })
        : new MouseEvent(name, { bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
    });
  }
}

function click(el: Element) {
  act(() => (el as HTMLElement).click());
}

const byText = (selector: string, text: string) =>
  Array.from(document.querySelectorAll(selector)).find((el) => el.textContent?.includes(text));

describe.each([
  ["mouse", MOUSE],
  ["touch", TOUCH],
])("portalled popups select on a %s press", (_kind, sequence) => {
  it("Select (listbox)", () => {
    const onValueChange = vi.fn();
    function Host() {
      const [v, setV] = useState("");
      return (
        <Select
          variant="listbox"
          list={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ]}
          value={v}
          onValueChange={(next: string) => {
            onValueChange(next);
            setV(next);
          }}
        />
      );
    }
    const host = mount(<Host />);
    click(host.querySelector("button")!);
    press(byText('[role="option"]', "Beta")!, sequence);
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("Dropdown", () => {
    const onSelect = vi.fn();
    mount(
      <Dropdown>
        <Dropdown.Trigger>
          <button type="button" data-testid="trigger">
            Account
          </button>
        </Dropdown.Trigger>
        <Dropdown.Items>
          <Dropdown.Item onClick={() => onSelect("Profile")}>Profile</Dropdown.Item>
        </Dropdown.Items>
      </Dropdown>,
    );
    click(document.querySelector('[data-testid="trigger"]')!);
    press(byText('[role="menuitem"]', "Profile")!, sequence);
    expect(onSelect).toHaveBeenCalledWith("Profile");
  });

  it("ContextMenu", () => {
    const onSelect = vi.fn();
    mount(
      <ContextMenu>
        <ContextMenu.Trigger>
          <div data-testid="area">Right-click me</div>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item onClick={() => onSelect("Copy")}>Copy</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>,
    );
    act(() => {
      document
        .querySelector('[data-testid="area"]')!
        .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    });
    press(byText('[role="menuitem"]', "Copy")!, sequence);
    expect(onSelect).toHaveBeenCalledWith("Copy");
  });

  it("Popover", () => {
    const onPress = vi.fn();
    mount(
      <Popover>
        <Popover.Trigger>
          <button type="button" data-testid="trigger">
            Open
          </button>
        </Popover.Trigger>
        <Popover.Content>
          <button type="button" data-testid="inner" onClick={onPress}>
            Inner
          </button>
        </Popover.Content>
      </Popover>,
    );
    click(document.querySelector('[data-testid="trigger"]')!);
    press(document.querySelector('[data-testid="inner"]')!, sequence);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-react-fancy-popover]")).not.toBeNull();
  });

  it("PhoneInput country picker", () => {
    const onValueChange = vi.fn();
    function Host() {
      const [v, setV] = useState<string | null>(null);
      return (
        <PhoneInput
          label="Phone"
          defaultCountry="US"
          countries={["US", "MM"]}
          value={v}
          onValueChange={(next, detail) => {
            onValueChange(next, detail);
            setV(next);
          }}
        />
      );
    }
    mount(<Host />);
    click(document.querySelector("[data-react-fancy-phone-input-country]")!);
    press(document.querySelector('[data-react-fancy-phone-input-option="MM"]')!, sequence);
    expect(document.querySelector("[data-react-fancy-phone-input-popup]")).toBeNull();
    expect(
      document.querySelector("[data-react-fancy-phone-input-country]")!.getAttribute("aria-label"),
    ).toContain("Myanmar");
  });
});

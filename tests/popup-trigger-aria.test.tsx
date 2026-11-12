// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, createRef, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Dropdown } from "../src/components/Dropdown";
import { Popover } from "../src/components/Popover";
import { Button } from "../src/components/Button";
import { ImagePill } from "../src/components/ImagePill";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Popup ARIA belongs on the element a screen reader focuses.
 *
 * Before 6.22.2, Dropdown.Trigger and Popover.Trigger rendered a role-less
 * `<span>` around their child and put `aria-haspopup` / `aria-expanded` on
 * that span. axe reports it as `aria-allowed-attr` (critical), and the button
 * inside, the element that actually takes focus, never announced that it opens
 * a menu or whether the menu was open.
 */

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  document.body.innerHTML = "";
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  cleanups.push(() => act(() => root.unmount()));
  return host;
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
  });
}

function key(k: string, on: Element) {
  act(() => {
    on.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
}

/** The element's role: explicit, or the implicit one of a native control. */
function roleOf(el: Element): string | null {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  const tag = el.tagName;
  if (tag === "BUTTON") return "button";
  if (tag === "A" && el.hasAttribute("href")) return "link";
  if (tag === "SELECT") return "combobox";
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    if (["button", "submit", "reset", "image"].includes(type)) return "button";
  }
  return null;
}

/** Every element carrying popup ARIA, asserting each one has a role. */
function popupAriaCarriers(): Element[] {
  const carriers = Array.from(document.querySelectorAll("[aria-haspopup], [aria-expanded]"));
  for (const el of carriers) {
    expect(roleOf(el), `role-less <${el.tagName.toLowerCase()}> carries popup ARIA: ${el.outerHTML}`).not.toBeNull();
  }
  return carriers;
}

/** The trigger is focusable: natively, or by tabindex. */
function isFocusable(el: HTMLElement): boolean {
  act(() => el.focus());
  return document.activeElement === el;
}

const dropdownMenu = () => document.querySelector<HTMLElement>("[data-react-fancy-dropdown]");

describe("Dropdown.Trigger: popup ARIA on the focusable child", () => {
  function Menu({ trigger }: { trigger: ReactElement | string }) {
    return (
      <Dropdown>
        <Dropdown.Trigger>{trigger}</Dropdown.Trigger>
        <Dropdown.Items>
          <Dropdown.Item>Profile</Dropdown.Item>
          <Dropdown.Item>Sign out</Dropdown.Item>
        </Dropdown.Items>
      </Dropdown>
    );
  }

  it("a <Button aria-label> child carries aria-haspopup, aria-expanded and aria-controls itself", () => {
    mount(<Menu trigger={<Button aria-label="Account options">GW</Button>} />);
    const button = document.querySelector<HTMLButtonElement>("button[data-react-fancy-button]")!;

    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.hasAttribute("aria-controls")).toBe(false);
    expect(button.getAttribute("aria-label")).toBe("Account options");
    // The stable handle moved onto the child with the ARIA.
    expect(button.hasAttribute("data-react-fancy-dropdown-trigger")).toBe(true);
    expect(popupAriaCarriers()).toEqual([button]);

    click(button);
    const menu = dropdownMenu()!;
    expect(menu).not.toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(menu.id).not.toBe("");
    expect(button.getAttribute("aria-controls")).toBe(menu.id);
    expect(document.getElementById(button.getAttribute("aria-controls")!)).toBe(menu);
    popupAriaCarriers();

    click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.hasAttribute("aria-controls")).toBe(false);
  });

  it("keeps the child's own props, handlers and ref", () => {
    const ref = createRef<HTMLButtonElement>();
    let clicks = 0;
    mount(
      <Menu
        trigger={
          <button type="button" ref={ref} className="mine" data-testid="t" onClick={() => clicks++}>
            Open
          </button>
        }
      />,
    );
    const button = document.querySelector<HTMLButtonElement>('[data-testid="t"]')!;
    expect(ref.current).toBe(button);
    expect(button.className).toBe("mine");
    click(button);
    expect(clicks).toBe(1);
    expect(dropdownMenu()).not.toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("a focusable <span tabIndex> child becomes role=button and carries the ARIA", () => {
    mount(<Menu trigger={<span tabIndex={0} data-testid="avatar">GW</span>} />);
    const avatar = document.querySelector<HTMLElement>('[data-testid="avatar"]')!;
    expect(avatar.getAttribute("role")).toBe("button");
    expect(avatar.getAttribute("aria-haspopup")).toBe("menu");
    expect(popupAriaCarriers()).toEqual([avatar]);

    act(() => avatar.focus());
    key(" ", avatar);
    expect(avatar.getAttribute("aria-expanded")).toBe("true");
    expect(avatar.getAttribute("aria-controls")).toBe(dropdownMenu()!.id);
  });

  it("plain text gets a focusable <button> of the trigger's own carrying the ARIA", () => {
    mount(<Menu trigger="Account" />);
    const trigger = document.querySelector<HTMLElement>("[data-react-fancy-dropdown-trigger]")!;
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("type")).toBe("button");
    expect(trigger.textContent).toBe("Account");
    expect(isFocusable(trigger)).toBe(true);
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(popupAriaCarriers()).toEqual([trigger]);

    // Keyboard is the menu-button pattern, as before: ArrowDown opens on the
    // first item.
    key("ArrowDown", trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(dropdownMenu()!.id);
    expect(document.activeElement?.textContent).toBe("Profile");
  });

  it("renders no wrapper around an element child", () => {
    const host = mount(<Menu trigger={<button type="button">Open</button>} />);
    expect(host.firstElementChild?.tagName).toBe("BUTTON");
  });
});

describe("Popover.Trigger: popup ARIA on the focusable child", () => {
  const content = () => document.querySelector<HTMLElement>("[data-react-fancy-popover]");

  it("a <button> child carries aria-haspopup, aria-expanded and aria-controls", () => {
    mount(
      <Popover>
        <Popover.Trigger aria-label="Fill colour">
          <button type="button" data-testid="pop">
            Fill
          </button>
        </Popover.Trigger>
        <Popover.Content>colours</Popover.Content>
      </Popover>,
    );
    const button = document.querySelector<HTMLButtonElement>('[data-testid="pop"]')!;
    expect(button.hasAttribute("aria-haspopup")).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.hasAttribute("data-react-fancy-popover-trigger")).toBe(true);
    // A prop forwarded to the trigger lands on the focusable child.
    expect(button.getAttribute("aria-label")).toBe("Fill colour");
    expect(popupAriaCarriers()).toEqual([button]);

    click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(content()!.id).not.toBe("");
    expect(button.getAttribute("aria-controls")).toBe(content()!.id);
    popupAriaCarriers();

    click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.hasAttribute("aria-controls")).toBe(false);
  });

  it("aria-controls names an id given to Popover.Content", () => {
    mount(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button" data-testid="pop">
            Fill
          </button>
        </Popover.Trigger>
        <Popover.Content id="fill-panel">colours</Popover.Content>
      </Popover>,
    );
    expect(content()!.id).toBe("fill-panel");
    expect(document.querySelector('[data-testid="pop"]')!.getAttribute("aria-controls")).toBe("fill-panel");
  });

  it("plain text gets a focusable <button> carrying the ARIA", () => {
    mount(
      <Popover>
        <Popover.Trigger>Details</Popover.Trigger>
        <Popover.Content>more</Popover.Content>
      </Popover>,
    );
    const trigger = document.querySelector<HTMLElement>("[data-react-fancy-popover-trigger]")!;
    expect(trigger.tagName).toBe("BUTTON");
    expect(isFocusable(trigger)).toBe(true);
    expect(popupAriaCarriers()).toEqual([trigger]);
    click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(content()!.id);
  });

  it("a hover popover claims no popup ARIA on any element (ImagePill)", () => {
    mount(<ImagePill label="screenshot.png" />);
    const pill = document.querySelector<HTMLElement>("[data-react-fancy-image-pill]")!;
    expect(pill.hasAttribute("data-react-fancy-popover-trigger")).toBe(true);
    expect(pill.getAttribute("role")).toBe("img");
    expect(popupAriaCarriers()).toEqual([]);
  });
});

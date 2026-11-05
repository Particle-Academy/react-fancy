// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Modal } from "../src/components/Modal";
import { Drawer } from "../src/components/Drawer";
import { Command } from "../src/components/Command";

/*
 * Up to 6.10.0 the focus trap of every dialog-shaped surface ran in the commit
 * where `open` flipped, but the panel did not exist yet: `useAnimation` mounts it
 * one render later and `Portal` renders its children one render after that. The
 * trap's effect found `ref.current === null`, returned, and never ran again
 * (its deps had not changed). So focus never moved in, Tab walked out of the
 * dialog, and closing never returned focus to the trigger. These tests open the
 * surface the way an app does — closed first, then `open` from a trigger.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

type Render = (open: boolean) => ReactElement;

function harness(render: Render, panelSelector: string) {
  const trigger = document.createElement("button");
  trigger.id = "trigger";
  document.body.append(trigger);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(render(false)));
  act(() => trigger.focus());
  const set = (open: boolean) => act(() => root.render(render(open)));
  const panel = () => document.querySelector<HTMLElement>(panelSelector);
  return { trigger, set, panel, unmount: () => act(() => root.unmount()) };
}

function tab(shiftKey = false) {
  const target = document.activeElement as HTMLElement;
  const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

const noop = () => {};

const cases: Array<[string, Render, string, string]> = [
  [
    "Modal",
    (open) => (
      <Modal open={open} onClose={noop}>
        <Modal.Body>
          <button id="first">first</button>
          <button id="last">last</button>
        </Modal.Body>
      </Modal>
    ),
    "[data-react-fancy-modal]",
    "first",
  ],
  [
    "Drawer",
    (open) => (
      <Drawer open={open} onClose={noop}>
        <Drawer.Body>
          <button id="first">first</button>
          <button id="last">last</button>
        </Drawer.Body>
      </Drawer>
    ),
    "[data-react-fancy-drawer]",
    "first",
  ],
  [
    "Command",
    (open) => (
      <Command open={open} onClose={noop}>
        <Command.Input placeholder="search" />
        <button id="last">last</button>
      </Command>
    ),
    "[data-react-fancy-command]",
    "",
  ],
];

describe.each(cases)("%s — focus trap when opened from a trigger", (_name, render, selector, firstId) => {
  it("moves focus into the panel once it has mounted", () => {
    const h = harness(render, selector);
    expect(document.activeElement).toBe(h.trigger);
    h.set(true);
    expect(h.panel()).not.toBeNull();
    expect(h.panel()!.contains(document.activeElement)).toBe(true);
    if (firstId) expect(document.activeElement?.id).toBe(firstId);
  });

  it("wraps Tab from the last item to the first, and Shift+Tab back", () => {
    const h = harness(render, selector);
    h.set(true);
    const items = h.panel()!.querySelectorAll<HTMLElement>("button, input");
    const first = items[0]!;
    const last = items[items.length - 1]!;

    act(() => last.focus());
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    expect(tab(true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it("returns focus to the trigger on close", () => {
    const h = harness(render, selector);
    h.set(true);
    expect(h.panel()!.contains(document.activeElement)).toBe(true);
    h.set(false);
    expect(document.activeElement).toBe(h.trigger);
  });
});

describe("Command — options are not tab stops", () => {
  // Options are `tabindex="-1"` (focus stays in the combobox input). The trap's
  // selector matched them anyway as `button`, took one for the LAST stop, never
  // saw focus on it, and let Tab walk out of the palette.
  it("Tab and Shift+Tab from the only real stop stay in the input", () => {
    const h = harness(
      (open) => (
        <Command open={open} onClose={noop}>
          <Command.Input placeholder="search" />
          <Command.List>
            <Command.Item value="one">one</Command.Item>
          </Command.List>
        </Command>
      ),
      "[data-react-fancy-command]",
    );
    h.set(true);
    const input = h.panel()!.querySelector("input")!;
    expect(document.activeElement).toBe(input);
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(tab(true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
  });
});

describe("Modal — starting open", () => {
  it("moves focus in on the first mount too", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() =>
      root.render(
        <Modal open onClose={noop}>
          <Modal.Body>
            <button id="first">first</button>
          </Modal.Body>
        </Modal>,
      ),
    );
    expect(document.activeElement?.id).toBe("first");
  });
});

describe("header close button — translatable name", () => {
  const closeName = () =>
    document.querySelector("[data-react-fancy-modal-header] button, [data-react-fancy-drawer-header] button")?.getAttribute("aria-label");

  it("Modal.Header defaults to Close and takes closeLabel", () => {
    const a = harness(() => (<Modal open onClose={noop}><Modal.Header>T</Modal.Header></Modal>), "[data-react-fancy-modal]");
    expect(closeName()).toBe("Close");
    a.unmount();
    document.body.innerHTML = "";
    harness(() => (<Modal open onClose={noop}><Modal.Header closeLabel="Schließen">T</Modal.Header></Modal>), "[data-react-fancy-modal]");
    expect(closeName()).toBe("Schließen");
  });

  it("Drawer.Header defaults to Close and takes closeLabel", () => {
    const a = harness(() => (<Drawer open onClose={noop}><Drawer.Header>T</Drawer.Header></Drawer>), "[data-react-fancy-drawer]");
    expect(closeName()).toBe("Close");
    a.unmount();
    document.body.innerHTML = "";
    harness(() => (<Drawer open onClose={noop}><Drawer.Header closeLabel="Fermer">T</Drawer.Header></Drawer>), "[data-react-fancy-drawer]");
    expect(closeName()).toBe("Fermer");
  });
});

describe("Drawer — container-attached", () => {
  it("still does NOT trap focus (it is a panel, not a dialog)", () => {
    const h = harness(
      (open) => (
        <Drawer open={open} onClose={noop} attach="container">
          <Drawer.Body>
            <button id="first">first</button>
          </Drawer.Body>
        </Drawer>
      ),
      "[data-react-fancy-drawer]",
    );
    h.set(true);
    expect(h.panel()).not.toBeNull();
    expect(document.activeElement).toBe(h.trigger);
  });
});

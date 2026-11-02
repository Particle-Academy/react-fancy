// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "../src/components/Sidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 6.1.0 — `keyboardNav`: ArrowUp / ArrowDown / Home / End between items, with
 * a roving tabindex (the rail is ONE tab stop; arrows move within it).
 *
 * Opt-in, because a roving tabindex necessarily changes Tab order: today every
 * item is its own tab stop, and with roving only one is. That is a behaviour
 * change for every keyboard user of an existing Sidebar, so it cannot be on by
 * default in a minor release.
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
  };
}

function press(el: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  act(() => {
    el.dispatchEvent(ev);
  });
  return ev;
}

function focus(el: HTMLElement) {
  act(() => el.focus());
}

const items = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-react-fancy-sidebar-item]"));
const byText = (t: string) =>
  Array.from(document.querySelectorAll<HTMLElement>("a,button")).find(
    (e) => e.textContent?.trim() === t,
  )!;
const active = () => (document.activeElement as HTMLElement).textContent?.trim();
const tabStops = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-react-fancy-sidebar] a, [data-react-fancy-sidebar] button"))
    .filter((e) => e.getAttribute("tabindex") !== "-1")
    .map((e) => e.textContent?.trim() || e.getAttribute("title"));

afterEach(() => {
  document.body.innerHTML = "";
});

function Basic(props: { keyboardNav?: boolean; collapsed?: boolean }) {
  return (
    <Sidebar keyboardNav={props.keyboardNav} collapsed={props.collapsed}>
      <Sidebar.Item href="/a">Alpha</Sidebar.Item>
      <Sidebar.Item active>Bravo</Sidebar.Item>
      <Sidebar.Item disabled>Charlie</Sidebar.Item>
      <Sidebar.Item>Delta</Sidebar.Item>
    </Sidebar>
  );
}

describe("off by default", () => {
  it("leaves every item its own tab stop and sets no tabindex", () => {
    mount(<Basic />);
    for (const el of items()) expect(el.hasAttribute("tabindex")).toBe(false);
  });

  it("does not move focus on arrows", () => {
    mount(<Basic />);
    focus(byText("Alpha"));
    const ev = press(byText("Alpha"), "ArrowDown");
    expect(active()).toBe("Alpha");
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe("keyboardNav", () => {
  it("makes the rail one tab stop, on the active item", () => {
    mount(<Basic keyboardNav />);
    expect(tabStops()).toEqual(["Bravo"]);
  });

  it("with no active item, the first enabled item is the stop", () => {
    mount(
      <Sidebar keyboardNav>
        <Sidebar.Item disabled>Zero</Sidebar.Item>
        <Sidebar.Item>One</Sidebar.Item>
        <Sidebar.Item>Two</Sidebar.Item>
      </Sidebar>,
    );
    expect(tabStops()).toEqual(["One"]);
  });

  it("ArrowDown / ArrowUp move focus, skipping disabled items", () => {
    mount(<Basic keyboardNav />);
    focus(byText("Bravo"));
    const ev = press(byText("Bravo"), "ArrowDown");
    expect(active()).toBe("Delta");
    expect(ev.defaultPrevented).toBe(true);
    press(byText("Delta"), "ArrowUp");
    expect(active()).toBe("Bravo");
    press(byText("Bravo"), "ArrowUp");
    expect(active()).toBe("Alpha");
  });

  it("does not wrap at either end", () => {
    mount(<Basic keyboardNav />);
    focus(byText("Delta"));
    press(byText("Delta"), "ArrowDown");
    expect(active()).toBe("Delta");
    focus(byText("Alpha"));
    press(byText("Alpha"), "ArrowUp");
    expect(active()).toBe("Alpha");
  });

  it("Home / End jump to the first / last enabled item", () => {
    mount(<Basic keyboardNav />);
    focus(byText("Bravo"));
    press(byText("Bravo"), "End");
    expect(active()).toBe("Delta");
    press(byText("Delta"), "Home");
    expect(active()).toBe("Alpha");
  });

  it("moves the tab stop with focus, including focus from a click", () => {
    mount(<Basic keyboardNav />);
    focus(byText("Delta"));
    expect(tabStops()).toEqual(["Delta"]);
    focus(byText("Bravo"));
    press(byText("Bravo"), "ArrowDown");
    expect(tabStops()).toEqual(["Delta"]);
  });

  it("ignores arrows with a modifier", () => {
    mount(<Basic keyboardNav />);
    focus(byText("Bravo"));
    const ev = press(byText("Bravo"), "ArrowDown", { altKey: true });
    expect(active()).toBe("Bravo");
    expect(ev.defaultPrevented).toBe(false);
  });

  it("works on a collapsed rail", () => {
    mount(<Basic keyboardNav collapsed />);
    focus(items()[1]);
    press(items()[1], "ArrowDown");
    expect(document.activeElement).toBe(items()[3]);
  });

  it("does not hijack keys inside an input in the sidebar", () => {
    mount(
      <Sidebar keyboardNav>
        <input aria-label="Filter" />
        <Sidebar.Item>One</Sidebar.Item>
        <Sidebar.Item>Two</Sidebar.Item>
      </Sidebar>,
    );
    const input = document.querySelector("input")!;
    focus(input);
    for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
      const ev = press(input, key);
      expect(document.activeElement).toBe(input);
      expect(ev.defaultPrevented).toBe(false);
    }
  });

  it("leaves Sidebar.Toggle in the normal tab order", () => {
    mount(
      <Sidebar keyboardNav>
        <Sidebar.Toggle />
        <Sidebar.Item>One</Sidebar.Item>
        <Sidebar.Item>Two</Sidebar.Item>
      </Sidebar>,
    );
    expect(tabStops()).toEqual(["Collapse sidebar", "One"]);
  });

  it("an item added later joins the roving set instead of becoming a second tab stop", async () => {
    function Grows() {
      const [more, setMore] = useState(false);
      return (
        <>
          <button data-testid="grow" onClick={() => setMore(true)}>grow</button>
          <Sidebar keyboardNav>
            <Sidebar.Item>One</Sidebar.Item>
            <Late show={more} />
          </Sidebar>
        </>
      );
    }
    function Late({ show }: { show: boolean }) {
      return show ? <Sidebar.Item>Two</Sidebar.Item> : null;
    }
    mount(<Grows />);
    // async act: the roving stop is re-applied by a MutationObserver, whose
    // callback is a microtask.
    await act(async () => (document.querySelector("[data-testid=grow]") as HTMLElement).click());
    expect(tabStops()).toEqual(["One"]);
    focus(byText("One"));
    press(byText("One"), "ArrowDown");
    expect(active()).toBe("Two");
  });

  it("turning it off restores every item as a tab stop", () => {
    const { rerender } = mount(<Basic keyboardNav />);
    rerender(<Basic />);
    for (const el of items()) expect(el.hasAttribute("tabindex")).toBe(false);
  });
});

describe("keyboardNav with submenus", () => {
  function WithSubmenu({ open }: { open: boolean }) {
    return (
      <Sidebar keyboardNav>
        <Sidebar.Item>Home</Sidebar.Item>
        <Sidebar.Submenu label="Reports" defaultOpen={open}>
          <Sidebar.Item>Monthly</Sidebar.Item>
          <Sidebar.Item>Yearly</Sidebar.Item>
        </Sidebar.Submenu>
        <Sidebar.Item>Settings</Sidebar.Item>
      </Sidebar>
    );
  }

  it("an open submenu: the trigger, then its items, in order", () => {
    mount(<WithSubmenu open />);
    focus(byText("Home"));
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      press(document.activeElement!, "ArrowDown");
      seen.push(active()!);
    }
    expect(seen).toEqual(["Reports", "Monthly", "Yearly", "Settings"]);
  });

  it("a closed submenu: its items are skipped, and are not tab stops", () => {
    mount(<WithSubmenu open={false} />);
    expect(tabStops()).toEqual(["Home"]);
    expect(byText("Monthly").getAttribute("tabindex")).toBe("-1");
    focus(byText("Home"));
    press(byText("Home"), "ArrowDown");
    expect(active()).toBe("Reports");
    press(byText("Reports"), "ArrowDown");
    expect(active()).toBe("Settings");
  });

  it("opening the submenu brings its items into the sequence", () => {
    mount(<WithSubmenu open={false} />);
    act(() => byText("Reports").click());
    focus(byText("Reports"));
    press(byText("Reports"), "ArrowDown");
    expect(active()).toBe("Monthly");
  });

  it("the submenu trigger joins the roving tabindex", () => {
    mount(<WithSubmenu open />);
    expect(byText("Reports").getAttribute("tabindex")).toBe("-1");
  });
});

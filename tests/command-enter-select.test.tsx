// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Command } from "../src/components/Command";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const input = () => document.querySelector<HTMLInputElement>("[data-react-fancy-command] input")!;

function type(text: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(input(), text);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** One act() per key: a real keypress gets a render before the next. */
function press(key: string, target: Element = input()) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

function Palette({ picked }: { picked: string[] }) {
  return (
    <Command open onClose={() => {}}>
      <Command.Input />
      <Command.List>
        {["Open settings", "New terminal", "Toggle theme"].map((x) => (
          <Command.Item key={x} onSelect={() => picked.push(x)}>
            {x}
          </Command.Item>
        ))}
      </Command.List>
    </Command>
  );
}

const option = (text: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((o) => o.textContent === text)!;

/**
 * Found by Genie 2's real-window test: typing a query and pressing Enter did
 * nothing, because Command started with no active item and handled no Enter —
 * only a FOCUSED item took Enter, as a native click. Every palette people know
 * picks the active item on Enter, or the first match when none is active.
 */
describe("Command — Enter picks, focus stays in the input", () => {
  it("Enter with nothing active picks the first visible item", () => {
    const picked: string[] = [];
    mount(<Palette picked={picked} />);

    // "term" matches only "New terminal", so it is first only if the filter ran
    // and Enter took the first VISIBLE item rather than the first item overall.
    type("term");
    press("Enter");

    expect(picked).toEqual(["New terminal"]);
  });

  it("Enter picks the item the arrows made active", () => {
    const picked: string[] = [];
    mount(<Palette picked={picked} />);

    press("ArrowDown");
    press("ArrowDown");
    press("Enter");

    expect(picked).toEqual(["New terminal"]);
  });

  it("the arrows leave focus in the input, pointing at the active item", () => {
    mount(<Palette picked={[]} />);
    act(() => input().focus());

    press("ArrowDown");

    expect(document.activeElement).toBe(input());
    const active = option("Open settings");
    expect(input().getAttribute("aria-activedescendant")).toBe(active.id);
    expect(active.getAttribute("aria-selected")).toBe("true");
    expect(option("New terminal").getAttribute("aria-selected")).toBe("false");
  });

  it("the input is a combobox wired to its list", () => {
    mount(<Palette picked={[]} />);

    const list = document.querySelector('[role="listbox"]')!;
    expect(input().getAttribute("role")).toBe("combobox");
    expect(input().getAttribute("aria-controls")).toBe(list.id);
    expect(list.id).not.toBe("");
  });

  it("wraps from the last item to the first", () => {
    const picked: string[] = [];
    mount(<Palette picked={picked} />);

    for (let i = 0; i < 4; i++) press("ArrowDown");
    press("Enter");

    expect(picked).toEqual(["Open settings"]);
  });

  it("typing resets the active item, so Enter picks the new first match", () => {
    const picked: string[] = [];
    mount(<Palette picked={picked} />);

    press("ArrowDown");
    press("ArrowDown");
    press("ArrowDown");
    type("open");
    press("Enter");

    expect(picked).toEqual(["Open settings"]);
  });

  it("hovering an item makes it the active one", () => {
    const picked: string[] = [];
    mount(<Palette picked={picked} />);

    act(() => {
      option("Toggle theme").dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    press("Enter");

    expect(picked).toEqual(["Toggle theme"]);
  });

  it("Enter with nothing to pick does nothing", () => {
    const picked: string[] = [];
    mount(<Palette picked={picked} />);

    type("zzz");
    press("Enter");

    expect(picked).toEqual([]);
  });
});

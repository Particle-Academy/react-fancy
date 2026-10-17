// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState, type ReactElement } from "react";
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

/** Types the way React notices: the native setter updates its value tracker. */
function type(text: string) {
  const input = document.querySelector<HTMLInputElement>("[data-react-fancy-command] input")!;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const items = () =>
  Array.from(document.querySelectorAll("[data-react-fancy-command-item]"), (el) => el.textContent);

/**
 * A palette that filters for itself — Genie 2's Command Window, where `w> tynn`
 * means "workspaces matching tynn" — could not use Command: every Item hid itself
 * because "tynn" does not contain "w> tynn". Asked for by tynn (Genie 2's
 * maintainer), 2026-10-17, after the cmdk prop of the same name.
 */
describe("Command — shouldFilter={false}", () => {
  it("still filters by default", () => {
    mount(
      <Command open onClose={() => {}}>
        <Command.Input />
        <Command.List>
          <Command.Item>tynn</Command.Item>
          <Command.Item>moic</Command.Item>
        </Command.List>
      </Command>,
    );

    type("ty");

    expect(items()).toEqual(["tynn"]);
  });

  it("renders every item the caller renders, whatever the query", () => {
    mount(
      <Command open onClose={() => {}} shouldFilter={false}>
        <Command.Input />
        <Command.List>
          <Command.Item>tynn</Command.Item>
          <Command.Item>moic</Command.Item>
        </Command.List>
      </Command>,
    );

    type("w> tynn");

    expect(items()).toEqual(["tynn", "moic"]);
  });

  it("hands the query to the caller, who decides what renders", () => {
    // Opting out of filtering is only useful if the caller can READ the query.
    // It was internal-only state, so it needed to become controllable too.
    function Palette() {
      const [query, setQuery] = useState("");
      const all = ["tynn", "moic", "fancy"];
      const match = query.startsWith("w> ") ? query.slice(3) : query;
      return (
        <Command open onClose={() => {}} shouldFilter={false} query={query} onQueryChange={setQuery}>
          <Command.Input />
          <Command.List>
            {all
              .filter((w) => w.includes(match))
              .map((w) => (
                <Command.Item key={w}>{w}</Command.Item>
              ))}
          </Command.List>
        </Command>
      );
    }
    mount(<Palette />);

    type("w> mo");

    expect(items()).toEqual(["moic"]);
  });

  it("a controlled query is what the input shows", () => {
    mount(
      <Command open onClose={() => {}} query="w> ">
        <Command.Input />
        <Command.List>
          <Command.Item>tynn</Command.Item>
        </Command.List>
      </Command>,
    );

    const input = document.querySelector<HTMLInputElement>("[data-react-fancy-command] input")!;
    expect(input.value).toBe("w> ");
  });

  it("keeps keyboard navigation with filtering off", () => {
    mount(
      <Command open onClose={() => {}} shouldFilter={false}>
        <Command.Input />
        <Command.List>
          <Command.Item>tynn</Command.Item>
          <Command.Item>moic</Command.Item>
        </Command.List>
      </Command>,
    );

    // One act() per press: a real keypress gets a render before the next one.
    for (let i = 0; i < 2; i++) {
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      });
    }

    expect(document.activeElement?.textContent).toBe("moic");
  });
});

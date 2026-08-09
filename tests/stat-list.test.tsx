// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { StatList } from "../src/components/StatList/StatList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

const ITEMS = [
  { value: "70", label: "packages" },
  { value: "261", label: "components" },
  { value: "MIT", label: "licensed" },
];

/**
 * `StatList` — the mono key/value stack (#170, task 224).
 *
 * The gallery index and `/packages` each hand-rolled the same right-aligned
 * monospace stat stack from tokens. That is the Inspiration Gallery working as
 * designed — it stress-tests the kit and what it hand-rolls is the gap list —
 * but the list only pays off if the gap comes back into react-fancy. Until it
 * does, every surface keeps its own copy and they drift.
 *
 * Deliberately NOT a new compound: it takes `items` as data rather than
 * children, because the story's third criterion is that no new export lands
 * where extending would do, and the thing being repeated here is a *shape*, not
 * a layout. Data in, one element out, nothing to assemble at each call site.
 */
describe("StatList", () => {
  it("renders every item's value and label", () => {
    const { host, unmount } = mount(<StatList items={ITEMS} />);

    const text = host.textContent ?? "";
    for (const { value, label } of ITEMS) {
      expect(text).toContain(value);
      expect(text).toContain(label);
    }

    unmount();
  });

  it("emphasises the value, not the label", () => {
    // The whole visual point: the number reads first. A stack where both halves
    // carry the same weight is just a list.
    const { host, unmount } = mount(<StatList items={ITEMS} />);

    const strong = host.querySelectorAll("b, strong");

    expect(strong.length).toBe(ITEMS.length);
    expect([...strong].map((n) => n.textContent)).toEqual(["70", "261", "MIT"]);

    unmount();
  });

  it("carries a stable handle per item", () => {
    // Human+ contract: an agent reading a figure off a page needs to address it
    // rather than count spans.
    const { host, unmount } = mount(<StatList items={ITEMS} />);

    expect(host.querySelector('[data-react-fancy-stat-list]')).not.toBeNull();
    expect(host.querySelectorAll("[data-stat]").length).toBe(3);
    expect(host.querySelector('[data-stat="packages"]')).not.toBeNull();

    unmount();
  });

  it("aligns right by default and left on request", () => {
    const right = mount(<StatList items={ITEMS} />);
    expect(right.host.querySelector("[data-align]")?.getAttribute("data-align")).toBe("right");
    right.unmount();

    const left = mount(<StatList items={ITEMS} align="left" />);
    expect(left.host.querySelector("[data-align]")?.getAttribute("data-align")).toBe("left");
    left.unmount();
  });

  it("forwards className and data-* like every other component", () => {
    // Same contract 5.8.0 fixed across the inputs family — a new component must
    // not reintroduce the hole.
    const { host, unmount } = mount(<StatList items={ITEMS} className="mine" data-handle="s" />);

    const root = host.querySelector("[data-react-fancy-stat-list]") as HTMLElement;

    expect(root.className).toContain("mine");
    expect(root.getAttribute("data-handle")).toBe("s");

    unmount();
  });

  it("renders nothing rather than an empty shell for no items", () => {
    const { host, unmount } = mount(<StatList items={[]} />);

    expect(host.querySelector("[data-react-fancy-stat-list]")).toBeNull();

    unmount();
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { MultiSwitch } from "../src/components/inputs/MultiSwitch/MultiSwitch";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

const LIST = [
  { value: "all", label: "All kinds" },
  { value: "ui", label: "UI" },
  { value: "backend", label: "Headless" },
];

/**
 * Two defects found by a consumer (the showcase's `/packages` filter toolbar),
 * filed as #24 and #25. They look unrelated and are the same story: the control
 * forwards everything a caller needs, and gives the caller no way to say it.
 */
describe("MultiSwitch — what a caller is allowed to pass", () => {
  it("declares the DOM attributes it forwards", () => {
    // The component spreads `...rest` onto its container, so `style`, `data-*`
    // and `aria-*` all WORK at runtime — and `MultiSwitchProps` extended
    // `InputBaseProps` alone, which declares none of them. Every one of those
    // props was implemented and unreachable, and a caller who tried got a
    // compiler error for something the component does correctly.
    //
    // Asserted against the source rather than the type system because `tsc`
    // here only covers `src`, so a type-level regression in a test file would
    // not fail anything. Same idiom as subpath-exports / styles-layering.
    const src = readFileSync(
      resolve(process.cwd(), "src/components/inputs/MultiSwitch/MultiSwitch.types.ts"),
      "utf8",
    );

    expect(src).toMatch(/HTMLAttributes<HTMLDivElement>/);
  });

  it("actually puts style, data-* and aria-* on the container", () => {
    // The other half: the type is only worth widening if the props still land.
    const { host, unmount } = mount(
      <MultiSwitch
        list={LIST}
        value="ui"
        style={{ ["--acc" as string]: "rebeccapurple" }}
        data-testid="basket-filter"
        aria-describedby="hint"
      />,
    );
    const el = host.querySelector("[data-react-fancy-multi-switch]") as HTMLElement;

    expect(el.style.getPropertyValue("--acc")).toBe("rebeccapurple");
    expect(el.getAttribute("data-testid")).toBe("basket-filter");
    expect(el.getAttribute("aria-describedby")).toBe("hint");

    unmount();
  });
});

describe("MultiSwitch — naming the group", () => {
  it("names the radiogroup when it is given a label", () => {
    // `<Field htmlFor>` renders `<label for=…>`, and a `<label>` only names
    // LABELABLE elements — input, select, textarea, button. The control here is
    // a `div[role="radiogroup"]`, which is not one, so the label sat next to an
    // unnamed group and looked like it had done its job.
    const { host, unmount } = mount(
      <MultiSwitch list={LIST} value="ui" label="Filter by basket" />,
    );
    const group = host.querySelector('[role="radiogroup"]') as HTMLElement;
    const labelledBy = group.getAttribute("aria-labelledby");

    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy as string)?.textContent).toContain(
      "Filter by basket",
    );

    unmount();
  });

  it("can carry a label for screen readers without drawing one", () => {
    // The case that produced this: two adjacent filters whose options already
    // say what they filter. The design draws no labels; the groups still need
    // names. Before `labelHidden` the only choices were an unnamed radiogroup or
    // a label the design does not have — and the silent one is the one that
    // ships.
    const { host, unmount } = mount(
      <MultiSwitch list={LIST} value="ui" label="Filter by basket" labelHidden />,
    );

    const label = host.querySelector("label") as HTMLElement;
    expect(label).not.toBeNull();
    expect(label.className).toMatch(/\bsr-only\b/);

    // Hidden visually, still naming the group.
    const group = host.querySelector('[role="radiogroup"]') as HTMLElement;
    expect(group.getAttribute("aria-labelledby")).toBe(label.id);

    unmount();
  });

  it("still draws the label when it is not asked to hide it", () => {
    // Guards the guard: `labelHidden` must be opt-in, or every labelled input in
    // every consumer loses its visible label in a patch release.
    const { host, unmount } = mount(
      <MultiSwitch list={LIST} value="ui" label="Filter by basket" />,
    );

    expect((host.querySelector("label") as HTMLElement).className).not.toMatch(/\bsr-only\b/);

    unmount();
  });
});

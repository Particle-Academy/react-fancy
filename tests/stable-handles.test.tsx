// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Checkbox } from "../src/components/inputs/Checkbox/Checkbox";
import { CheckboxGroup } from "../src/components/inputs/CheckboxGroup/CheckboxGroup";
import { MultiSwitch } from "../src/components/inputs/MultiSwitch/MultiSwitch";
import { RadioGroup } from "../src/components/inputs/RadioGroup/RadioGroup";
import { Switch } from "../src/components/inputs/Switch/Switch";
import { ColorPicker } from "../src/components/ColorPicker/ColorPicker";
import { Table } from "../src/components/Table/Table";
import { TableRow } from "../src/components/Table/TableRow";
import { TableCell } from "../src/components/Table/TableCell";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/** Does a `data-*` handle put on the component actually reach the DOM? */
function reaches(el: ReactElement, selector = "[data-handle]"): boolean {
  const { host, unmount } = mount(el);
  const found = host.querySelector(selector) !== null;
  unmount();
  return found;
}

/**
 * Stable handles — issues #22 and #19.
 *
 * The component contract makes this a requirement, not a nicety:
 *
 *   > Each interactive element has a stable identity (`id`, `data-*`, or a
 *   > selector prop). Agents never guess DOM.
 *
 * These components named every prop they used and had no `...rest`, so anything
 * unrecognised was dropped. Nothing anywhere reports that: React discards
 * unknown props on a component silently, TypeScript permits `data-*` on JSX, and
 * the component renders perfectly. The failure only appears when something tries
 * to ADDRESS the control — which is the agent-driving case the contract exists
 * to protect, and the one nobody exercises while building the page.
 *
 * #22 was found exactly that way: four `Switch`es tagged with `data-pw-set` in
 * the showcase, and the selector matched zero elements.
 *
 * The reported components were `Switch` and `Table.Row`. Auditing the family in
 * one pass — as #22 suggested — found three more, so the whole set is asserted
 * here. A per-component fix would have left the same trap in place next door.
 */
describe("data-* handles reach the DOM", () => {
  it("Switch", () => {
    expect(reaches(<Switch data-handle="s" checked={false} onCheckedChange={() => {}} />)).toBe(true);
  });

  it("Checkbox", () => {
    expect(reaches(<Checkbox data-handle="c" checked={false} onCheckedChange={() => {}} />)).toBe(true);
  });

  it("CheckboxGroup", () => {
    expect(
      reaches(
        <CheckboxGroup
          data-handle="cg"
          list={[{ label: "A", value: "a" }]}
          value={[]}
          onValueChange={() => {}}
        />,
      ),
    ).toBe(true);
  });

  it("RadioGroup", () => {
    expect(
      reaches(
        <RadioGroup
          data-handle="rg"
          list={[{ label: "A", value: "a" }]}
          value="a"
          onValueChange={() => {}}
        />,
      ),
    ).toBe(true);
  });

  it("MultiSwitch", () => {
    expect(
      reaches(
        <MultiSwitch
          data-handle="ms"
          list={[
            { label: "A", value: "a" },
            { label: "B", value: "b" },
          ]}
          value="a"
          onValueChange={() => {}}
        />,
      ),
    ).toBe(true);
  });

  it("ColorPicker, in BOTH modes", () => {
    // Missed by the 5.8.0 sweep, and found by building `JsonEditor` on top of
    // it: a `color`-typed field could not carry the handle its row needed, so
    // the handle had to hang off a wrapper element instead.
    //
    // Both modes are asserted because this component swaps its root: `view`
    // renders a different `<div>` from `edit`, and a spread added to only one
    // of them makes the handle appear and disappear with an unrelated prop.
    expect(reaches(<ColorPicker data-handle="cp" value="#3b82f6" />)).toBe(true);
    expect(reaches(<ColorPicker data-handle="cp" value="#3b82f6" mode="view" />)).toBe(true);
  });

  it("Table.Row", () => {
    // #19: without a handle on the row there is no way to mark a keyboard
    // cursor or point an agent at "the row you just changed".
    expect(
      reaches(
        <Table>
          <TableRow data-handle="r">
            <TableCell>x</TableCell>
          </TableRow>
        </Table>,
      ),
    ).toBe(true);
  });
});

describe("aria-* is forwarded too", () => {
  it("Table.Row carries aria-current", () => {
    // The other half of #19. A keyboard cursor is expressed with aria-current;
    // dropping it silently makes the row unmarkable for assistive tech as well
    // as for agents.
    expect(
      reaches(
        <Table>
          <TableRow aria-current="true">
            <TableCell>x</TableCell>
          </TableRow>
        </Table>,
        "[aria-current]",
      ),
    ).toBe(true);
  });

  it("Switch carries aria-describedby", () => {
    expect(
      reaches(
        <Switch aria-describedby="hint" checked={false} onCheckedChange={() => {}} />,
        "[aria-describedby]",
      ),
    ).toBe(true);
  });
});

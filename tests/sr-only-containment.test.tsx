// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ResizablePanels } from "../src/components/ResizablePanels";
import { Switch } from "../src/components/inputs/Switch";
import { Checkbox } from "../src/components/inputs/Checkbox";
import { CheckboxGroup } from "../src/components/inputs/CheckboxGroup";
import { RadioGroup } from "../src/components/inputs/RadioGroup";
import { Field } from "../src/components/inputs/Field";
import { ModalBody } from "../src/components/Modal/ModalBody";
import { DrawerBody } from "../src/components/Drawer/DrawerBody";
import { Table } from "../src/components/Table";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * THE BUG (consumer report against 6.24.1, measured in headless Chromium).
 *
 * Tailwind's `sr-only` is `position: absolute` with no insets, so the element
 * sits at its STATIC position, resolved against the nearest POSITIONED
 * ancestor. `overflow: auto` only clips descendants whose containing block is
 * the scroller or inside it. A ResizablePanels panel was `overflow-auto` and
 * not positioned, so a `labelHidden` Switch / Checkbox / RadioGroup label deep
 * in a scrolled panel escaped the clip and stretched the DOCUMENT: 12
 * labelHidden Switches in an 800px shell gave a 1688px document (the
 * labelled Switches, with no `sr-only`, gave 800px).
 *
 * jsdom does no layout, so this asserts the invariant layout depends on: every
 * `sr-only` element has a positioned ancestor no further out than the
 * component's own root, and every kit scroller is itself positioned.
 */

const POSITIONED = /(^|\s)(relative|absolute|fixed|sticky)(\s|$)/;

let root: Root | null = null;
let host: HTMLElement | null = null;

function mount(el: ReactElement): HTMLElement {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return host;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  host?.remove();
  root = null;
  host = null;
});

/** The nearest ancestor carrying a positioning utility, or null. */
function positionedAncestor(el: Element): Element | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (POSITIONED.test(p.getAttribute("class") ?? "")) return p;
  }
  return null;
}

function expectContained(container: HTMLElement, rootSelector: string) {
  const componentRoot = container.querySelector(rootSelector);
  expect(componentRoot, `no ${rootSelector}`).not.toBeNull();
  const hidden = Array.from(componentRoot!.querySelectorAll(".sr-only"));
  expect(hidden.length, `no sr-only element under ${rootSelector}`).toBeGreaterThan(0);
  for (const el of hidden) {
    const cb = positionedAncestor(el);
    expect(cb, `${el.outerHTML} has no positioned ancestor`).not.toBeNull();
    // The containing block must be the component root or inside it.
    expect(componentRoot === cb || componentRoot!.contains(cb), `${el.outerHTML} escapes ${rootSelector}`).toBe(true);
  }
}

describe("a visually hidden label never resolves against an ancestor outside its component", () => {
  it("Switch labelHidden", () => {
    const c = mount(<Switch label="Notify" labelHidden name="notify" />);
    expectContained(c, "[data-react-fancy-switch]");
  });

  it("Checkbox labelHidden", () => {
    const c = mount(<Checkbox label="Agree" labelHidden />);
    expectContained(c, "[data-react-fancy-checkbox]");
  });

  it("RadioGroup labelHidden (through Field)", () => {
    const c = mount(<RadioGroup label="Size" labelHidden list={[{ value: "s", label: "S" }]} />);
    expectContained(c, "[data-react-fancy-field]");
  });

  it("CheckboxGroup labelHidden (through Field)", () => {
    const c = mount(<CheckboxGroup label="Days" labelHidden list={[{ value: "mon", label: "Mon" }]} />);
    expectContained(c, "[data-react-fancy-field]");
  });

  it("Field labelHidden", () => {
    const c = mount(
      <Field label="Name" labelHidden htmlFor="n">
        <input id="n" />
      </Field>,
    );
    expectContained(c, "[data-react-fancy-field]");
  });
});

describe("a kit scroller is a containing block, so it clips what it scrolls", () => {
  it("both ResizablePanels panels are positioned", () => {
    const c = mount(
      <ResizablePanels>
        <div>a</div>
        <div>b</div>
      </ResizablePanels>,
    );
    const panels = c.querySelectorAll("[data-react-fancy-resizable-panels-panel]");
    expect(panels).toHaveLength(2);
    for (const p of panels) expect(p.getAttribute("class")).toMatch(POSITIONED);
  });

  it("ModalBody and DrawerBody are positioned", () => {
    const c = mount(
      <>
        <ModalBody>m</ModalBody>
        <DrawerBody>d</DrawerBody>
      </>,
    );
    expect(c.querySelector("[data-react-fancy-modal-body]")!.getAttribute("class")).toMatch(POSITIONED);
    expect(c.querySelector("[data-react-fancy-drawer-body]")!.getAttribute("class")).toMatch(POSITIONED);
  });

  it("the Table wrapper (overflow-hidden) is positioned", () => {
    const c = mount(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>x</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(c.querySelector("[data-react-fancy-table]")!.getAttribute("class")).toMatch(POSITIONED);
  });
});

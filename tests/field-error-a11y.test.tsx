// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Checkbox } from "../src/components/inputs/Checkbox";
import { DatePicker } from "../src/components/inputs/DatePicker";
import { Input } from "../src/components/inputs/Input";
import { RadioGroup } from "../src/components/inputs/RadioGroup";
import { Select } from "../src/components/inputs/Select";
import { Textarea } from "../src/components/inputs/Textarea";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 6.20.0, K1 of the full-kit benchmark: a field error must reach assistive
 * technology, not only the screen.
 *
 * Every form control rendered its `error` as a plain paragraph. The control had
 * no `aria-invalid` and no `aria-describedby`, and nothing was announced, so a
 * screen reader user who submitted an empty form heard nothing at all while
 * "The name field is required." sat on screen. axe could not catch it either:
 * nothing was marked up for it to check.
 *
 * The contract, per control:
 *  - the control carries `aria-invalid="true"` while it has an error, and not
 *    otherwise;
 *  - its `aria-describedby` names the element holding the message (or the
 *    description, when there is no error), keeping any id the host passed;
 *  - the message is `role="alert"`, so it is announced when it appears. That is
 *    the kit's pattern for an error that appears on its own (Composer,
 *    PromptInput, FileBrowser's new-folder field): an alert is announced on
 *    insertion, a polite region inserted with its text already in it is not
 *    reliably announced at all.
 */

let root: Root | null = null;
let host: HTMLElement | null = null;

function mount(el: ReactElement) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(el));
}

function rerender(el: ReactElement) {
  act(() => root!.render(el));
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
});

const MESSAGE = "The name field is required.";

function messageEl(): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>("*")].find(
    (el) => el.children.length === 0 && el.textContent === MESSAGE,
  );
  if (!found) throw new Error("error message is not rendered");
  return found;
}

function describedByIds(el: Element): string[] {
  return (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
}

function expectExposed(control: Element | null, label: string) {
  expect(control, `${label}: control`).not.toBeNull();
  expect(control!.getAttribute("aria-invalid"), `${label}: aria-invalid`).toBe("true");
  const msg = messageEl();
  expect(msg.id, `${label}: the message needs an id to be described by`).not.toBe("");
  expect(describedByIds(control!), `${label}: aria-describedby names the message`).toContain(msg.id);
  expect(msg.getAttribute("role"), `${label}: the message is announced`).toBe("alert");
}

type Case = [name: string, render: (error?: string) => ReactElement, control: () => Element | null];

const radios = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

const CASES: Case[] = [
  ["Input", (error) => <Input id="f-name" label="Name" error={error} />, () => document.querySelector("#f-name")],
  ["Input (no label)", (error) => <Input id="f-bare" error={error} />, () => document.querySelector("#f-bare")],
  ["Textarea", (error) => <Textarea id="f-msg" label="Message" error={error} />, () => document.querySelector("#f-msg")],
  [
    "Select (native)",
    (error) => <Select id="f-sel" label="Pick" list={["one", "two"]} error={error} />,
    () => document.querySelector("#f-sel"),
  ],
  [
    "Select (listbox)",
    (error) => <Select id="f-lb" variant="listbox" label="Pick" list={["one", "two"]} error={error} />,
    () => document.querySelector("#f-lb"),
  ],
  [
    "RadioGroup",
    (error) => <RadioGroup label="Size" list={radios} error={error} />,
    () => document.querySelector('[role="radiogroup"]'),
  ],
  ["Checkbox", (error) => <Checkbox id="f-ok" label="I agree" error={error} />, () => document.querySelector("#f-ok")],
  ["Checkbox (no label)", (error) => <Checkbox id="f-ok2" error={error} />, () => document.querySelector("#f-ok2")],
  ["DatePicker", (error) => <DatePicker id="f-date" label="Pickup" error={error} />, () => document.querySelector("#f-date")],
  [
    "DatePicker (range)",
    (error) => <DatePicker id="f-range" range label="Stay" error={error} />,
    () => document.querySelector("#f-range"),
  ],
];

describe("field errors reach assistive technology", () => {
  for (const [name, render, control] of CASES) {
    it(`${name}: aria-invalid, aria-describedby and an alert while in error`, () => {
      mount(render(MESSAGE));
      expectExposed(control(), name);
    });

    it(`${name}: clean when the error clears`, () => {
      mount(render(MESSAGE));
      rerender(render(undefined));
      const el = control();
      expect(el).not.toBeNull();
      expect(el!.hasAttribute("aria-invalid"), `${name}: no aria-invalid without an error`).toBe(false);
      expect(document.querySelector('[role="alert"]')).toBeNull();
    });
  }

  it("the range DatePicker marks BOTH of its inputs invalid", () => {
    mount(<DatePicker id="r2" range label="Stay" error={MESSAGE} />);
    const inputs = document.querySelectorAll('input[type="date"]');
    expect(inputs).toHaveLength(2);
    for (const el of inputs) {
      expect(el.getAttribute("aria-invalid")).toBe("true");
      expect(describedByIds(el)).toContain(messageEl().id);
    }
  });

  it("points aria-describedby at the description when there is no error", () => {
    mount(<Input id="d1" label="Name" description="As on your card" />);
    const input = document.querySelector("#d1")!;
    const desc = [...document.querySelectorAll("p")].find((p) => p.textContent === "As on your card")!;
    expect(desc.id).not.toBe("");
    expect(describedByIds(input)).toEqual([desc.id]);
  });

  it("keeps an aria-describedby the host passed, alongside the message", () => {
    mount(<Input id="h1" label="Name" aria-describedby="host-hint" error={MESSAGE} />);
    const ids = describedByIds(document.querySelector("#h1")!);
    expect(ids).toContain("host-hint");
    expect(ids).toContain(messageEl().id);
  });

  it("the paste-pill Input marks its editable surface the same way", () => {
    mount(<Input id="p1" label="Name" pasteThreshold={50} error={MESSAGE} />);
    expectExposed(document.querySelector('#p1[role="textbox"]'), "Input (paste pills)");
  });

  it("the message ids are unique per control", () => {
    mount(
      <>
        <Input label="A" error={MESSAGE} />
        <Input label="B" error={MESSAGE} />
      </>,
    );
    const alerts = [...document.querySelectorAll('[role="alert"]')].map((el) => el.id);
    expect(alerts).toHaveLength(2);
    expect(new Set(alerts).size).toBe(2);
  });
});

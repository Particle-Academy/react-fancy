// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { renderToString } from "react-dom/server";
import { Accordion } from "../src/components/Accordion";
import { mount } from "./content-renderer-helpers";

/**
 * K10 (kit-site benchmark): Accordion took `type` and `defaultOpen` only, so an
 * agent could neither read nor set which item is open. The component contract
 * requires controlled state: `value` + `onChange`.
 *
 * Value shape follows `type`: `string | null` for "single", `string[]` for
 * "multiple". `defaultOpen` (and the new `defaultValue`) keep uncontrolled use
 * working.
 */

function items() {
  return ["a", "b", "c"].map((v) => (
    <Accordion.Item key={v} value={v}>
      <Accordion.Trigger>Item {v}</Accordion.Trigger>
      <Accordion.Content>Body {v}</Accordion.Content>
    </Accordion.Item>
  ));
}

const trigger = (host: HTMLElement, v: string) =>
  host.querySelector<HTMLButtonElement>(`[data-react-fancy-accordion-item][data-value="${v}"] [data-react-fancy-accordion-trigger]`)!;
const expanded = (host: HTMLElement) =>
  ["a", "b", "c"].filter((v) => trigger(host, v)?.getAttribute("aria-expanded") === "true");

describe("Accordion handles", () => {
  it("marks each item with its value and open state", () => {
    const { host } = mount(<Accordion defaultOpen={["b"]}>{items()}</Accordion>);
    const b = host.querySelector<HTMLElement>('[data-react-fancy-accordion-item][data-value="b"]')!;
    const a = host.querySelector<HTMLElement>('[data-react-fancy-accordion-item][data-value="a"]')!;
    expect(b.getAttribute("data-state")).toBe("open");
    expect(a.getAttribute("data-state")).toBe("closed");
  });
});

describe("Accordion controlled, single", () => {
  it("renders the item `value` names as open", () => {
    const { host } = mount(<Accordion value="c" onChange={() => {}}>{items()}</Accordion>);
    expect(expanded(host)).toEqual(["c"]);
  });

  it("reports the next value and does not move by itself", () => {
    const onChange = vi.fn();
    const { host } = mount(<Accordion value="a" onChange={onChange}>{items()}</Accordion>);
    act(() => trigger(host, "b").click());
    expect(onChange).toHaveBeenCalledWith("b");
    // Still controlled: the parent did not accept it.
    expect(expanded(host)).toEqual(["a"]);
  });

  it("reports null when the open item is closed", () => {
    const onChange = vi.fn();
    const { host } = mount(<Accordion value="a" onChange={onChange}>{items()}</Accordion>);
    act(() => trigger(host, "a").click());
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("follows the parent: value={null} closes everything", () => {
    const { host, rerender } = mount(<Accordion value="a" onChange={() => {}}>{items()}</Accordion>);
    rerender(<Accordion value={null} onChange={() => {}}>{items()}</Accordion>);
    expect(expanded(host)).toEqual([]);
  });

  it("round-trips through a parent's state", () => {
    function Host() {
      const [v, setV] = useState<string | null>(null);
      return (
        <>
          <output data-x="v">{String(v)}</output>
          <Accordion value={v} onChange={setV}>{items()}</Accordion>
        </>
      );
    }
    const { host } = mount(<Host />);
    act(() => trigger(host, "b").click());
    expect(expanded(host)).toEqual(["b"]);
    expect(host.querySelector('[data-x="v"]')!.textContent).toBe("b");
  });
});

describe("Accordion controlled, multiple", () => {
  it("renders every item in `value` as open", () => {
    const { host } = mount(<Accordion type="multiple" value={["a", "c"]} onChange={() => {}}>{items()}</Accordion>);
    expect(expanded(host)).toEqual(["a", "c"]);
  });

  it("reports the whole next array", () => {
    const onChange = vi.fn();
    const { host } = mount(<Accordion type="multiple" value={["a"]} onChange={onChange}>{items()}</Accordion>);
    act(() => trigger(host, "c").click());
    expect(onChange).toHaveBeenCalledWith(["a", "c"]);

    const closing = vi.fn();
    const m = mount(<Accordion type="multiple" value={["a"]} onChange={closing}>{items()}</Accordion>);
    act(() => trigger(m.host, "a").click());
    expect(closing).toHaveBeenCalledWith([]);
  });
});

describe("Accordion uncontrolled", () => {
  it("still works with defaultOpen, and reports through onChange", () => {
    const onChange = vi.fn();
    const { host } = mount(<Accordion defaultOpen={["a"]} onChange={onChange}>{items()}</Accordion>);
    expect(expanded(host)).toEqual(["a"]);
    act(() => trigger(host, "b").click());
    expect(expanded(host)).toEqual(["b"]);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("accepts defaultValue in the value's own shape", () => {
    const { host } = mount(<Accordion defaultValue="b">{items()}</Accordion>);
    expect(expanded(host)).toEqual(["b"]);
    const m = mount(<Accordion type="multiple" defaultValue={["a", "b"]}>{items()}</Accordion>);
    expect(expanded(m.host)).toEqual(["a", "b"]);
  });

  it("server-renders the open state from value", () => {
    const html = renderToString(<Accordion value="b" onChange={() => {}}>{items()}</Accordion>);
    expect(html).toMatch(/data-value="b" data-state="open"/);
  });
});

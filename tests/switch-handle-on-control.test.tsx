// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState } from "react";

import { Switch } from "../src/components/inputs/Switch";
import { mount, unmountAll } from "./contrast-assert";

/**
 * A stable handle has to name the element that ACTS (component contract:
 * "Each interactive element has a stable identity"). Switch spread `data-*`
 * onto its wrapper div, so `[data-x]` matched an element that ignores clicks:
 * `document.querySelector("[data-x]").click()` did nothing, and a consumer
 * (fancy-graph's controls overlay) had to re-tag the `role="switch"` button by
 * hand after every commit to give agents something addressable.
 */

afterEach(unmountAll);

function Controlled(props: { onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(false);
  return (
    <Switch
      label="Motion"
      checked={on}
      onCheckedChange={(v) => {
        setOn(v);
        props.onChange?.(v);
      }}
      data-graph-toggle="motion"
    />
  );
}

describe("Switch — data-* handles land on the role=switch button", () => {
  it("the handle names the switch itself", () => {
    const { host } = mount(<Controlled />);
    const el = host.querySelector("[data-graph-toggle]");
    expect(el?.getAttribute("role")).toBe("switch");
    expect(el?.getAttribute("data-graph-toggle")).toBe("motion");
  });

  it("is the ONLY element carrying it, so a single-element locator is not ambiguous", () => {
    const { host } = mount(<Controlled />);
    expect(host.querySelectorAll("[data-graph-toggle]")).toHaveLength(1);
  });

  it("clicking the element the handle names toggles the switch", () => {
    const seen: boolean[] = [];
    const { host } = mount(<Controlled onChange={(v) => seen.push(v)} />);
    act(() => host.querySelector<HTMLElement>("[data-graph-toggle]")!.click());
    expect(seen).toEqual([true]);
    expect(host.querySelector('[role="switch"]')!.getAttribute("aria-checked")).toBe("true");
  });

  it("the wrapper keeps its own data-react-fancy-switch handle, className and style", () => {
    const { host } = mount(<Switch className="my-switch" style={{ opacity: 0.5 }} data-testid="sw" />);
    const wrapper = host.querySelector<HTMLElement>("[data-react-fancy-switch]")!;
    expect(wrapper.className).toContain("my-switch");
    expect(wrapper.style.opacity).toBe("0.5");
    expect(wrapper.hasAttribute("data-testid")).toBe(false);
    expect(host.querySelector('[role="switch"]')!.getAttribute("data-testid")).toBe("sw");
  });

  it("in view mode there is no switch, so the handle stays on the wrapper", () => {
    const { host } = mount(<Switch mode="view" checked data-graph-toggle="motion" />);
    expect(host.querySelector('[role="switch"]')).toBeNull();
    expect(host.querySelector("[data-graph-toggle]")?.hasAttribute("data-react-fancy-switch")).toBe(true);
  });
});

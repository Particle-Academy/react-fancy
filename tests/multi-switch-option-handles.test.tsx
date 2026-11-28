// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState } from "react";

import { MultiSwitch } from "../src/components/inputs/MultiSwitch/MultiSwitch";
import type { MultiSwitchOption } from "../src/components/inputs/MultiSwitch/MultiSwitch.types";
import { mount, unmountAll } from "./contrast-assert";

/**
 * Each MultiSwitch option is an interactive element, so it owes a stable handle
 * (component contract). Options took no attributes at all: a consumer
 * (fancy-graph's controls overlay) had to find the n-th `[role="radio"]` and
 * tag it by position after every commit, which breaks the moment the list is
 * reordered.
 */

afterEach(unmountAll);

const LIST: MultiSwitchOption[] = [
  { value: "all", label: "All", attributes: { "data-graph-toggle": "link-mode:all" } },
  { value: "none", label: "None", attributes: { "data-graph-toggle": "link-mode:none" } },
];

const radios = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[role="radio"]')];

describe("MultiSwitch — per-option attributes", () => {
  it("renders an option's data-* on that option's role=radio button", () => {
    const { host } = mount(<MultiSwitch list={LIST} value="all" />);
    const el = host.querySelector('[data-graph-toggle="link-mode:none"]');
    expect(el?.getAttribute("role")).toBe("radio");
    expect(el?.textContent).toBe("None");
    expect(host.querySelectorAll("[data-graph-toggle]")).toHaveLength(2);
  });

  it("clicking the element the handle names selects that option", () => {
    function Controlled() {
      const [v, setV] = useState("all");
      return <MultiSwitch list={LIST} value={v} onValueChange={setV} />;
    }
    const { host } = mount(<Controlled />);
    act(() => host.querySelector<HTMLElement>('[data-graph-toggle="link-mode:none"]')!.click());
    expect(host.querySelector('[data-graph-toggle="link-mode:none"]')!.getAttribute("aria-checked")).toBe("true");
  });

  it("passes only data-* keys, so an option cannot override role, aria-checked or handlers", () => {
    const list = [
      {
        value: "a",
        label: "A",
        attributes: { "data-ok": "1", role: "button", "aria-checked": "false", onClick: "x" },
      },
    ] as unknown as MultiSwitchOption[];
    const { host } = mount(<MultiSwitch list={list} value="a" />);
    const [a] = radios(host);
    expect(a.getAttribute("data-ok")).toBe("1");
    expect(a.getAttribute("role")).toBe("radio");
    expect(a.getAttribute("aria-checked")).toBe("true");
    expect(a.hasAttribute("onclick")).toBe(false);
  });

  it("every option carries a built-in handle and its value, with no attributes given", () => {
    const { host } = mount(<MultiSwitch list={["Day", "Week"]} value="Day" />);
    const [day, week] = radios(host);
    expect(day.hasAttribute("data-react-fancy-multi-switch-option")).toBe(true);
    expect(day.getAttribute("data-value")).toBe("Day");
    expect(week.getAttribute("data-value")).toBe("Week");
  });

  it("does not write data-value for a value that has no faithful string form", () => {
    const a = { id: 1 };
    const { host } = mount(
      <MultiSwitch<{ id: number }> list={[{ value: a, label: "A" }]} value={a} />,
    );
    expect(radios(host)[0].hasAttribute("data-value")).toBe(false);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { MultiSwitch } from "../src/components/inputs/MultiSwitch/MultiSwitch";
import type { MultiSwitchOption } from "../src/components/inputs/MultiSwitch/MultiSwitch.types";
import { COLORS } from "../src/utils/types";
import { multiSwitchColorClasses } from "../src/components/inputs/MultiSwitch/MultiSwitch.colors";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * MultiSwitch per-option colour (5.58.0). Requested by a consumer: a green
 * "Assign" against a red "Unassign", on the selected thumb and the border.
 */

const mounted: Array<() => void> = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

const LIST: MultiSwitchOption[] = [
  { value: "assign", label: "Assign", color: "green" },
  { value: "unassign", label: "Unassign", color: "red" },
  { value: "skip", label: "Skip" },
];

const group = (host: HTMLElement) => host.querySelector<HTMLElement>('[role="radiogroup"]')!;
const thumb = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-multi-switch-thumb]")!;
const radio = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll<HTMLElement>('[role="radio"]')].find((b) => b.textContent === label)!;

describe("MultiSwitch — per-option colour", () => {
  it("paints the thumb in the selected option's colour", () => {
    const { host } = mount(<MultiSwitch list={LIST} value="assign" />);
    expect(thumb(host).getAttribute("data-color")).toBe("green");
    expect(thumb(host).className).toContain("bg-green-600");
    expect(thumb(host).className).not.toContain("bg-blue-600");
  });

  it("follows the selection to another option's colour", () => {
    const { host, rerender } = mount(<MultiSwitch list={LIST} value="assign" />);
    rerender(<MultiSwitch list={LIST} value="unassign" />);
    expect(thumb(host).getAttribute("data-color")).toBe("red");
    expect(thumb(host).className).toContain("bg-red-600");
  });

  it("colours the border with the selected option's colour, light and dark", () => {
    const { host } = mount(<MultiSwitch list={LIST} value="unassign" />);
    const cls = group(host).className;
    expect(cls).toContain("border-red-500");
    expect(cls).toContain("dark:border-red-400");
    expect(cls).not.toContain("--fancy-border-strong");
  });

  it("an option without a colour keeps today's blue thumb and neutral border", () => {
    const { host } = mount(<MultiSwitch list={LIST} value="skip" />);
    expect(thumb(host).getAttribute("data-color")).toBeNull();
    expect(thumb(host).className).toContain("bg-blue-600");
    expect(group(host).className).toContain("--fancy-border-strong");
  });

  it("a switch with no colours anywhere renders exactly as before", () => {
    const plain = [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ];
    const { host } = mount(<MultiSwitch list={plain} value="a" />);
    expect(thumb(host).className).toBe(
      "absolute top-0 bottom-0 rounded-lg bg-blue-600 transition-all duration-200 ease-out",
    );
    expect(radio(host, "A").className).toContain("text-white");
  });

  it("a light colour gets dark label text, so the selected label stays readable", () => {
    const list: MultiSwitchOption[] = [
      { value: "a", label: "Warn", color: "amber" },
      { value: "b", label: "Ok", color: "green" },
    ];
    const { host } = mount(<MultiSwitch list={list} value="a" />);
    expect(radio(host, "Warn").className).toContain("text-amber-950");
    expect(radio(host, "Warn").className).not.toContain("text-white");
  });

  it("a caller's own className still wins over the colour border", () => {
    const { host } = mount(<MultiSwitch list={LIST} value="assign" className="border-2 border-black" />);
    const cls = group(host).className;
    expect(cls).toContain("border-black");
    expect(cls).not.toContain("border-green-500");
  });

  it("every colour in the palette has literal classes (Tailwind cannot see built names)", () => {
    for (const c of COLORS) {
      const entry = multiSwitchColorClasses[c];
      expect(entry, c).toBeDefined();
      expect(entry.thumb, c).toMatch(/\bbg-/);
      expect(entry.border, c).toMatch(/\bborder-/);
      expect(entry.text, c).toMatch(/\btext-/);
    }
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Switch } from "../src/components/inputs/Switch";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

function mount(el: ReactElement): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const control = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('[role="switch"]')!;
const wrapper = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-switch]")!;

describe("Switch — labelHidden", () => {
  it("keeps the label for assistive tech but does not draw it", () => {
    const host = mount(<Switch label="Dark mode" labelHidden />);
    const label = host.querySelector("label")!;
    expect(label).not.toBeNull();
    expect(label.className).toContain("sr-only");
    // Still the accessible name: the label points at the control.
    expect(label.htmlFor).toBe(control(host).id);
    expect(label.textContent).toBe("Dark mode");
  });

  it("draws the label when labelHidden is not set", () => {
    const host = mount(<Switch label="Dark mode" />);
    expect(host.querySelector("label")!.className).not.toContain("sr-only");
  });

  it("does not leak labelHidden onto the DOM", () => {
    const host = mount(<Switch label="Dark mode" labelHidden />);
    expect(wrapper(host).hasAttribute("labelhidden")).toBe(false);
    expect(wrapper(host).hasAttribute("labelHidden")).toBe(false);
  });
});

describe("Switch — aria-* name the control, not the wrapper", () => {
  it("aria-label lands on the role=switch button", () => {
    const host = mount(<Switch aria-label="Enable alerts" />);
    expect(control(host).getAttribute("aria-label")).toBe("Enable alerts");
    expect(wrapper(host).hasAttribute("aria-label")).toBe(false);
  });

  it("aria-labelledby and aria-describedby land on the button", () => {
    const host = mount(<Switch aria-labelledby="ext-label" aria-describedby="ext-help" />);
    expect(control(host).getAttribute("aria-labelledby")).toBe("ext-label");
    expect(control(host).getAttribute("aria-describedby")).toBe("ext-help");
    expect(wrapper(host).hasAttribute("aria-labelledby")).toBe(false);
  });

  it("className, style and data-* stay on the wrapper, as before", () => {
    const host = mount(
      <Switch className="mt-4 my-switch" style={{ opacity: 0.5 }} data-testid="sw" aria-label="x" />,
    );
    const w = wrapper(host);
    expect(w.className).toContain("my-switch");
    expect(w.className).toContain("mt-4");
    expect(w.style.opacity).toBe("0.5");
    expect(w.getAttribute("data-testid")).toBe("sw");
    expect(control(host).className).not.toContain("my-switch");
  });
});

describe("Switch — the unchecked track reads the kit's semantic token", () => {
  it("uses --fancy-border / --fancy-border-dark with today's zinc-200 / zinc-600 as fallbacks", () => {
    const host = mount(<Switch />);
    const cls = control(host).className;
    expect(cls).toContain("bg-[color:var(--fancy-border,var(--color-zinc-200))]");
    expect(cls).toContain("dark:bg-[color:var(--fancy-border-dark,var(--color-zinc-600))]");
    expect(cls).not.toMatch(/(^|\s)bg-zinc-200(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)dark:bg-zinc-600(\s|$)/);
  });

  it("the checked track still uses the colour prop", () => {
    const host = mount(<Switch checked color="emerald" />);
    expect(control(host).className).not.toContain("--fancy-border");
  });
});

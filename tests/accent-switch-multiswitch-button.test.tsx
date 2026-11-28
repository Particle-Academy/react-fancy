// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { CSSProperties, ReactElement } from "react";

import { Switch } from "../src/components/inputs/Switch";
import { MultiSwitch } from "../src/components/inputs/MultiSwitch/MultiSwitch";
import { Button } from "../src/components/Button";
import { mount, unmountAll } from "./contrast-assert";
import { installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

/**
 * The kit accent (`--fancy-accent` / `--fancy-accent-dark`) reached the native
 * toggles (6.18.0) but not Switch, MultiSwitch or an `active` Button: those
 * painted a hard-coded blue whatever the host set, so a themed app had to pass
 * `color` to every one of them (fancy-graph's controls overlay did exactly
 * that). Switch's focus ring was a hard-coded blue too.
 *
 * Measured through the rendered CSS. "Set nothing, see no change" is checked by
 * rendering a REFERENCE element carrying the exact utility each surface used
 * before, in the same stylesheet, and comparing what the browser resolves.
 */

afterEach(() => {
  unmountAll();
  removeRenderedCss();
});

const HOST = { "--fancy-accent": "#c2603d", "--fancy-accent-dark": "#7fb0e0" } as CSSProperties;

function place(el: ReactElement, opts: { dark?: boolean; style?: CSSProperties } = {}) {
  const { host } = mount(
    <div className={opts.dark ? "dark" : undefined} style={opts.style}>
      {el}
    </div>,
  );
  return host;
}

/** A plain span carrying the old utility, to measure the old colour against. */
function reference(className: string, dark = false): HTMLElement {
  const host = place(<span data-ref="" data-force-focus-visible="" className={className} />, { dark });
  return host.querySelector<HTMLElement>("[data-ref]")!;
}

const bg = (el: Element) => resolveVars(el, getComputedStyle(el).backgroundColor);
const ring = (el: Element) => resolveVars(el, getComputedStyle(el).getPropertyValue("--tw-ring-color"));

const switchEl = (host: HTMLElement) => host.querySelector<HTMLElement>('[role="switch"]')!;
const thumbEl = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-multi-switch-thumb]")!;
const buttonEl = (host: HTMLElement) => host.querySelector<HTMLElement>("button")!;

const MS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

describe("Switch — checked track", () => {
  it("unset accent: identical to the old bg-blue-500, in both modes", async () => {
    const light = switchEl(place(<Switch checked />));
    const dark = switchEl(place(<Switch checked />, { dark: true }));
    const ref = reference("bg-blue-500");
    const refDark = reference("bg-blue-500", true);
    await installRenderedCss();
    expect(bg(ref)).toMatch(/oklch|rgb/);
    expect(bg(light)).toBe(bg(ref));
    expect(bg(dark)).toBe(bg(refDark));
  });

  it("follows a host-set accent in each mode", async () => {
    const light = switchEl(place(<Switch checked />, { style: HOST }));
    const dark = switchEl(place(<Switch checked />, { dark: true, style: HOST }));
    await installRenderedCss();
    expect(bg(light)).toBe("#c2603d");
    expect(bg(dark)).toBe("#7fb0e0");
  });

  it("an explicit color still wins over the accent", async () => {
    const el = switchEl(place(<Switch checked color="emerald" />, { style: HOST }));
    const ref = reference("bg-emerald-500");
    await installRenderedCss();
    expect(bg(el)).toBe(bg(ref));
  });
});

describe("Switch — focus ring", () => {
  // The ring's 40% lives in Tailwind's `@supports (color: color-mix)` block for
  // a var() colour, which the jsdom flattener drops, so these compare the BASE
  // colour the ring resolves to, and the opacity is pinned by class below.
  it("unset accent: the ring is still blue-500, in both modes", async () => {
    const light = switchEl(place(<Switch />));
    const dark = switchEl(place(<Switch />, { dark: true }));
    light.setAttribute("data-force-focus-visible", "");
    dark.setAttribute("data-force-focus-visible", "");
    await installRenderedCss({ forceFocusVisible: true });
    const blue500 = resolveVars(light, "var(--color-blue-500)");
    expect(blue500).toMatch(/^oklch\(/);
    expect(ring(light)).toContain(blue500);
    expect(ring(dark)).toContain(blue500);
  });

  it("keeps the 40% ring opacity and drops the hard-coded blue", () => {
    const c = switchEl(place(<Switch />)).className.split(/\s+/);
    expect(c).not.toContain("focus-visible:ring-blue-500/40");
    expect(c.filter((x) => /^focus-visible:ring-\[color:/.test(x)).every((x) => x.endsWith("/40"))).toBe(true);
    expect(c.filter((x) => /^dark:focus-visible:ring-\[color:/.test(x)).every((x) => x.endsWith("/40"))).toBe(true);
    expect(c.some((x) => x.startsWith("dark:focus-visible:ring-[color:"))).toBe(true);
  });

  it("a host's --fancy-focus still wins over the accent, like every other control", async () => {
    const style = { ...HOST, "--fancy-focus": "#123456" } as CSSProperties;
    const el = switchEl(place(<Switch />, { style }));
    el.setAttribute("data-force-focus-visible", "");
    await installRenderedCss({ forceFocusVisible: true });
    expect(ring(el)).toContain("#123456");
  });

  it("follows a host-set accent in each mode", async () => {
    const light = switchEl(place(<Switch />, { style: HOST }));
    const dark = switchEl(place(<Switch />, { dark: true, style: HOST }));
    light.setAttribute("data-force-focus-visible", "");
    dark.setAttribute("data-force-focus-visible", "");
    await installRenderedCss({ forceFocusVisible: true });
    expect(ring(light)).toContain("#c2603d");
    expect(ring(dark)).toContain("#7fb0e0");
  });
});

describe("MultiSwitch — selected thumb", () => {
  it("unset accent: identical to the old bg-blue-600, in both modes", async () => {
    const light = thumbEl(place(<MultiSwitch list={MS} value="a" />));
    const dark = thumbEl(place(<MultiSwitch list={MS} value="a" />, { dark: true }));
    const ref = reference("bg-blue-600");
    const refDark = reference("bg-blue-600", true);
    await installRenderedCss();
    expect(bg(ref)).toMatch(/oklch|rgb/);
    expect(bg(light)).toBe(bg(ref));
    expect(bg(dark)).toBe(bg(refDark));
  });

  it("follows a host-set accent in each mode", async () => {
    const light = thumbEl(place(<MultiSwitch list={MS} value="a" />, { style: HOST }));
    const dark = thumbEl(place(<MultiSwitch list={MS} value="a" />, { dark: true, style: HOST }));
    await installRenderedCss();
    expect(bg(light)).toBe("#c2603d");
    expect(bg(dark)).toBe("#7fb0e0");
  });

  it("an option's own color still wins over the accent", async () => {
    const list = [{ value: "a", label: "A", color: "green" as const }, { value: "b", label: "B" }];
    const el = thumbEl(place(<MultiSwitch list={list} value="a" />, { style: HOST }));
    const ref = reference("bg-green-700");
    await installRenderedCss();
    expect(bg(el)).toBe(bg(ref));
  });
});

describe("Button — active fill", () => {
  it("unset accent: identical to the old blue-600 / dark blue-700 fill", async () => {
    const light = buttonEl(place(<Button active>Layers</Button>));
    const dark = buttonEl(place(<Button active>Layers</Button>, { dark: true }));
    const ref = reference("bg-blue-600");
    const refDark = reference("dark:bg-blue-700", true);
    await installRenderedCss();
    expect(bg(ref)).toMatch(/oklch|rgb/);
    expect(bg(light)).toBe(bg(ref));
    expect(bg(dark)).toBe(bg(refDark));
  });

  it("follows a host-set accent in each mode", async () => {
    const light = buttonEl(place(<Button active>Layers</Button>, { style: HOST }));
    const dark = buttonEl(place(<Button active>Layers</Button>, { dark: true, style: HOST }));
    await installRenderedCss();
    expect(bg(light)).toBe("#c2603d");
    expect(bg(dark)).toBe("#7fb0e0");
  });

  it("an explicit color still wins over the accent", async () => {
    const el = buttonEl(place(<Button active color="violet">Layers</Button>, { style: HOST }));
    await installRenderedCss();
    expect(bg(el)).not.toBe("#c2603d");
  });

  it("a default (not active) Button is untouched by the accent", async () => {
    const el = buttonEl(place(<Button>Layers</Button>, { style: HOST }));
    await installRenderedCss();
    expect(bg(el)).not.toBe("#c2603d");
  });

  it("its border reads the accent too, falling back to the old blue-700 / dark blue-600", () => {
    // jsdom does not substitute var() inside `border-color`, so the border is
    // pinned by class; theme-tokens.test.tsx proves each class is generated.
    const c = buttonEl(place(<Button active>Layers</Button>)).className.split(/\s+/);
    expect(c).toContain("border-[color:var(--fancy-accent,var(--color-blue-700))]");
    expect(c).toContain("dark:border-[color:var(--fancy-accent-dark,var(--color-blue-600))]");
    expect(c).not.toContain("border-blue-700");
    expect(c).not.toContain("dark:border-blue-600");
  });
});

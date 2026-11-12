// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { CSSProperties } from "react";
import { Modal } from "../src/components/Modal";
import { PortalContainerContext } from "../src/components/Portal";
import { SHAPE_TOKENS, THEME_TOKENS } from "../src/theme-tokens";
import { AA, NON_TEXT, mount, unmountAll } from "./contrast-assert";
import { contrast } from "./contrast-helper";
import { installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

/**
 * Modal theme tokens: `--fancy-radius-modal` for the panel's corners, and the
 * `modal-header-bg` / `modal-header-text` pairs (each with a `-dark` twin) for
 * the header. The title and the close button follow the text token, at rest and
 * on hover; the close button's hover fill follows the header fill.
 *
 * Defaults are what the Modal painted before: `rounded-2xl` corners, no header
 * fill (the panel's surface shows through), the `text` token on the title, and
 * `text-muted` hovering to `text-soft` on `surface-muted` for the close button.
 * Measured through the rendered CSS, like success-token.test.tsx.
 */

afterEach(() => {
  unmountAll();
  removeRenderedCss();
  document.querySelectorAll("[data-test-portal-target]").forEach((n) => n.remove());
});

/** A portal target per mode, so both modes render side by side. */
function target(mode: "light" | "dark", style?: CSSProperties): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("data-test-portal-target", mode);
  if (mode === "dark") el.className = "dark";
  if (style) for (const [k, v] of Object.entries(style)) el.style.setProperty(k, String(v));
  document.body.append(el);
  return el;
}

function modalIn(container: HTMLElement) {
  return (
    <PortalContainerContext.Provider value={container}>
      <Modal open onClose={() => {}}>
        <Modal.Header>Confirm action</Modal.Header>
        <Modal.Body>Body</Modal.Body>
        <Modal.Footer>Footer</Modal.Footer>
      </Modal>
    </PortalContainerContext.Provider>
  );
}

type Parts = { panel: HTMLElement; header: HTMLElement; title: HTMLElement; close: HTMLElement };

function parts(container: HTMLElement): Parts {
  const panel = container.querySelector<HTMLElement>("[data-react-fancy-modal]")!;
  const header = container.querySelector<HTMLElement>("[data-react-fancy-modal-header]")!;
  const close = container.querySelector<HTMLElement>("[data-react-fancy-modal-close]")!;
  const title = header.firstElementChild as HTMLElement;
  return { panel, header, title, close };
}

function render(style?: CSSProperties) {
  const light = target("light", style);
  const dark = target("dark", style);
  mount(modalIn(light));
  mount(modalIn(dark));
  return { light: parts(light), dark: parts(dark) };
}

const TRANSPARENT = new Set(["", "transparent", "rgba(0, 0, 0, 0)", "rgba(0,0,0,0)"]);

/** The background a reader sees behind `el`: its own fill, else the nearest painted ancestor's. */
function effectiveBg(el: Element): string {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const v = resolveVars(n, getComputedStyle(n).getPropertyValue("background-color"));
    if (!TRANSPARENT.has(v)) return v;
  }
  throw new Error("no painted ancestor");
}

const colour = (el: Element) => resolveVars(el, getComputedStyle(el).getPropertyValue("color"));
const ownBg = (el: Element) => resolveVars(el, getComputedStyle(el).getPropertyValue("background-color"));
const radius = (el: Element) => resolveVars(el, getComputedStyle(el).getPropertyValue("border-radius"));
const palette = (el: Element, name: string) => resolveVars(el, `var(--color-${name})`);

describe("the Modal tokens are recorded", () => {
  it("THEME_TOKENS carries the header pairs, defaulting to today's header", () => {
    expect(THEME_TOKENS["modal-header-bg"]).toMatchObject({
      variable: "--fancy-modal-header-bg",
      darkVariable: "--fancy-modal-header-bg-dark",
      light: "transparent",
      dark: "transparent",
    });
    expect(THEME_TOKENS["modal-header-text"]).toMatchObject({
      variable: "--fancy-modal-header-text",
      darkVariable: "--fancy-modal-header-text-dark",
      light: "var(--fancy-text,var(--color-zinc-900))",
      dark: "var(--fancy-text-dark,var(--color-zinc-100))",
    });
  });

  it("SHAPE_TOKENS carries the modal radius, defaulting to rounded-2xl", () => {
    expect(SHAPE_TOKENS["radius-modal"]).toMatchObject({
      variable: "--fancy-radius-modal",
      value: "var(--radius-2xl)",
    });
  });
});

describe("Modal defaults are unchanged", () => {
  it("keeps every data-react-fancy-modal* handle", () => {
    const { light } = render();
    for (const el of [light.panel, light.header, light.close]) expect(el).not.toBeNull();
    const container = light.panel.parentElement!.parentElement!;
    expect(container.querySelector("[data-react-fancy-modal-body]")).not.toBeNull();
    expect(container.querySelector("[data-react-fancy-modal-footer]")).not.toBeNull();
    expect(light.close.getAttribute("aria-label")).toBe("Close");
  });

  it("paints the panel, header, title and close button as before, in both modes", async () => {
    const { light, dark } = render();
    await installRenderedCss();
    // Corners: `rounded-2xl` is `var(--radius-2xl)`, 1rem by default.
    expect(radius(light.panel)).toBe(resolveVars(light.panel, "var(--radius-2xl)"));
    expect(radius(light.panel)).toBe("1rem");
    // No header fill of its own: the panel's surface shows through.
    expect(TRANSPARENT.has(ownBg(light.header))).toBe(true);
    expect(TRANSPARENT.has(ownBg(dark.header))).toBe(true);
    expect(effectiveBg(light.header)).toBe(palette(light.header, "white"));
    expect(effectiveBg(dark.header)).toBe(palette(dark.header, "zinc-900"));
    // Title: the `text` token's default.
    expect(colour(light.title)).toBe(palette(light.title, "zinc-900"));
    expect(colour(dark.title)).toBe(palette(dark.title, "zinc-100"));
    // Close: `text-muted` at rest.
    expect(colour(light.close)).toBe(palette(light.close, "zinc-500"));
    expect(colour(dark.close)).toBe(palette(dark.close, "zinc-400"));
  });

  it("hovers the close button as before: text-soft on surface-muted", async () => {
    const { light, dark } = render();
    light.close.setAttribute("data-force-hover", "");
    dark.close.setAttribute("data-force-hover", "");
    await installRenderedCss({ forceHover: true });
    expect(colour(light.close)).toBe(palette(light.close, "zinc-700"));
    expect(colour(dark.close)).toBe(palette(dark.close, "zinc-300"));
    expect(ownBg(light.close)).toBe(palette(light.close, "zinc-100"));
    expect(ownBg(dark.close)).toBe(palette(dark.close, "zinc-800"));
  });

  it("still follows a host's general text tokens when the header tokens are unset", async () => {
    const { light, dark } = render({
      "--fancy-text": "#2a1a10",
      "--fancy-text-dark": "#f5efe6",
      "--fancy-text-muted": "#6b5a4c",
      "--fancy-text-muted-dark": "#b8a898",
    } as CSSProperties);
    await installRenderedCss();
    expect(colour(light.title)).toBe("#2a1a10");
    expect(colour(dark.title)).toBe("#f5efe6");
    expect(colour(light.close)).toBe("#6b5a4c");
    expect(colour(dark.close)).toBe("#b8a898");
  });
});

describe("the default header pair is readable", () => {
  it("title >= 4.5:1 and close >= 3:1 (at rest and on hover) in both modes", async () => {
    const rest = render();
    await installRenderedCss();
    const resting = {
      light: { title: colour(rest.light.title), close: colour(rest.light.close), bg: effectiveBg(rest.light.header) },
      dark: { title: colour(rest.dark.title), close: colour(rest.dark.close), bg: effectiveBg(rest.dark.header) },
    };
    unmountAll();
    removeRenderedCss();
    document.querySelectorAll("[data-test-portal-target]").forEach((n) => n.remove());

    const hov = render();
    hov.light.close.setAttribute("data-force-hover", "");
    hov.dark.close.setAttribute("data-force-hover", "");
    await installRenderedCss({ forceHover: true });

    for (const mode of ["light", "dark"] as const) {
      const r = resting[mode];
      for (const v of [r.title, r.close, r.bg]) expect(v, mode).toMatch(/^oklch\(|^#|^rgb/);
      const t = contrast(r.title, r.bg);
      expect(t, `${mode} title ${t.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
      const c = contrast(r.close, r.bg);
      expect(c, `${mode} close at rest ${c.toFixed(2)}:1`).toBeGreaterThanOrEqual(NON_TEXT);
      const h = hov[mode].close;
      const hc = contrast(colour(h), ownBg(h));
      expect(hc, `${mode} close on hover ${hc.toFixed(2)}:1`).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });
});

describe("host values are honoured", () => {
  const HOST = {
    "--fancy-radius-modal": "6px",
    "--fancy-modal-header-bg": "#1d3557",
    "--fancy-modal-header-bg-dark": "#0b1a2e",
    "--fancy-modal-header-text": "#f1faee",
    "--fancy-modal-header-text-dark": "#e8f1ff",
  } as CSSProperties;

  it("the radius, header fill and header text, in each mode", async () => {
    const { light, dark } = render(HOST);
    await installRenderedCss();
    expect(radius(light.panel)).toBe("6px");
    expect(radius(dark.panel)).toBe("6px");
    expect(ownBg(light.header)).toBe("#1d3557");
    expect(ownBg(dark.header)).toBe("#0b1a2e");
    expect(colour(light.title)).toBe("#f1faee");
    expect(colour(dark.title)).toBe("#e8f1ff");
    expect(colour(light.close)).toBe("#f1faee");
    expect(colour(dark.close)).toBe("#e8f1ff");
  });

  it("the close button's hover keeps the header text on the header fill", async () => {
    const { light, dark } = render(HOST);
    light.close.setAttribute("data-force-hover", "");
    dark.close.setAttribute("data-force-hover", "");
    await installRenderedCss({ forceHover: true });
    expect(colour(light.close)).toBe("#f1faee");
    expect(colour(dark.close)).toBe("#e8f1ff");
    expect(ownBg(light.close)).toBe("#1d3557");
    expect(ownBg(dark.close)).toBe("#0b1a2e");
  });
});

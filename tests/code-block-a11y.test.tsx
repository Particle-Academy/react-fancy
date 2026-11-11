// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DARK_COLORS, LIGHT_COLORS } from "@particle-academy/fancy-file-commons";
import { CodeBlock } from "../src/components/CodeBlock";
import { contrast } from "./contrast-helper";
import { mount } from "./content-renderer-helpers";

/**
 * K9 (kit-site benchmark, docs-site `/install` and `/usage`, run 170):
 *
 *  1. The header title was painted `gutterForeground` on `gutterBackground`
 *     (#94a3b8 on #f8fafc light, #52525b on #18181b dark), about 2.4:1. axe
 *     `color-contrast` failed it. A title is text a reader needs, not gutter
 *     decoration, so it must reach 4.5:1 in BOTH palettes.
 *  2. At 375 px the `<pre>` scrolls horizontally and could not be reached from
 *     the keyboard (axe `scrollable-region-focusable`, serious). A keyboard user
 *     had no way to scroll it. It must be a focusable, named region.
 *
 * jsdom resolves no `var()`, so the colour is read from the inline style's
 * palette variable and looked up in the same palettes the component declares.
 */

/** `var(--fc-gutterForeground,var(--fc-gutterForeground-l))` -> `gutterForeground`. */
function paletteKey(value: string): keyof typeof LIGHT_COLORS {
  const m = /--fc-([A-Za-z]+)/.exec(value);
  expect(m, `not a palette colour: ${value}`).not.toBeNull();
  return m![1] as keyof typeof LIGHT_COLORS;
}

function titleContrast(palette: typeof LIGHT_COLORS) {
  const { host } = mount(<CodeBlock code="npm install x" language="sh" title="Terminal" />);
  const title = host.querySelector<HTMLElement>("[data-react-fancy-code-block-title]")!;
  const header = host.querySelector<HTMLElement>("[data-react-fancy-code-block-header]")!;
  // The title's own colour, or the header's it inherits.
  const fg = title.style.color || header.style.color;
  const bg = header.style.backgroundColor;
  return contrast(palette[paletteKey(fg)], palette[paletteKey(bg)]);
}

describe("CodeBlock title contrast", () => {
  it("reaches 4.5:1 in the light palette", () => {
    expect(titleContrast(LIGHT_COLORS)).toBeGreaterThanOrEqual(4.5);
  });

  it("reaches 4.5:1 in the dark palette", () => {
    expect(titleContrast(DARK_COLORS)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("CodeBlock scrollable region", () => {
  const pre = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-code-block-pre]")!;

  it("is in the tab order", () => {
    const { host } = mount(<CodeBlock code="a very long line" />);
    expect(pre(host).tabIndex).toBe(0);
    expect(pre(host).getAttribute("tabindex")).toBe("0");
  });

  it("is a region named after a string title", () => {
    const { host } = mount(<CodeBlock code="x" language="php" title="setup.php" />);
    expect(pre(host).getAttribute("role")).toBe("region");
    expect(pre(host).getAttribute("aria-label")).toBe("setup.php");
  });

  it("has a default name without a title", () => {
    const { host } = mount(<CodeBlock code="x" />);
    expect(pre(host).getAttribute("role")).toBe("region");
    expect(pre(host).getAttribute("aria-label")).toBe("Code");
  });

  it("takes its name from labels.region, over the title", () => {
    const { host } = mount(<CodeBlock code="x" title="setup.php" labels={{ region: "Código" }} />);
    expect(pre(host).getAttribute("aria-label")).toBe("Código");
  });

  it("can be focused, and shows a focus ring when it is", () => {
    const { host } = mount(<CodeBlock code="x" />);
    const el = pre(host);
    el.focus();
    expect(document.activeElement).toBe(el);
    expect(el.className).toMatch(/focus-visible:(ring|outline)-/);
  });
});

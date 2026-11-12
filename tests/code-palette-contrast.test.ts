import { describe, expect, it } from "vitest";
import { DARK_COLORS, LIGHT_COLORS } from "@particle-academy/fancy-file-commons";
import {
  CODE_DARK_COLORS,
  CODE_LIGHT_COLORS,
  CODE_PALETTE_STYLE,
} from "../src/components/CodeView/code-palette";

/**
 * Every syntax token CodeBlock and CodeView paint meets WCAG AA (4.5:1) on the
 * code background, in BOTH palettes.
 *
 * Measured 2026-11-11 by the lab's full-kit benchmark (finding K9): with
 * fancy-file-commons' palettes, eight light tokens were below 4.5:1 on
 * #ffffff (keyword 4.23, string 3.77, comment 2.56, number 3.19, operator 3.68,
 * type 3.19, attribute 3.19, attributeValue 3.77), and the dark comment was
 * 3.67:1 on #18181b. axe flagged `code > span:nth-child(2)` on a docs page.
 */

const SYNTAX = [
  "foreground", "keyword", "string", "comment", "number", "operator", "function",
  "type", "tag", "attribute", "attributeValue", "punctuation", "variable",
] as const;

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("code palette contrast", () => {
  for (const [name, palette] of [["light", CODE_LIGHT_COLORS], ["dark", CODE_DARK_COLORS]] as const) {
    for (const key of SYNTAX) {
      it(`${name} ${key} is at least 4.5:1 on the code background`, () => {
        const ratio = contrast(palette[key], palette.background);
        expect(ratio, `${name} ${key} ${palette[key]} on ${palette.background}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("keeps fancy-file-commons' backgrounds and chrome, changing only token colours", () => {
    for (const key of ["background", "gutterBackground", "gutterForeground", "gutterBorder", "cursorColor"] as const) {
      expect(CODE_LIGHT_COLORS[key]).toBe(LIGHT_COLORS[key]);
      expect(CODE_DARK_COLORS[key]).toBe(DARK_COLORS[key]);
    }
  });

  it("is the palette the components actually paint", () => {
    const style = CODE_PALETTE_STYLE as Record<string, string>;
    for (const key of SYNTAX) {
      expect(style[`--fc-${key}-l`]).toBe(CODE_LIGHT_COLORS[key]);
      expect(style[`--fc-${key}-d`]).toBe(CODE_DARK_COLORS[key]);
    }
  });
});

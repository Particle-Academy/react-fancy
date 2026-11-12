import type { CSSProperties } from "react";
import {
  themeColorVar,
  themeVariables,
  LIGHT_COLORS,
  DARK_COLORS,
  type ThemeColorKey,
} from "@particle-academy/fancy-file-commons";

// ── Both palettes, switched by CSS ──────────────────────────────────────────
// CodeBlock and CodeView used to pick ONE palette with a client-only hook, so
// server-rendered HTML always carried the light colours and a dark site flashed
// light until hydration. Now the markup is the same in either theme:
//
//  1. the root declares `--fc-<key>-l` and `--fc-<key>-d` (both palettes, via
//     fancy-file-commons' `themeVariables`, which allow-lists every value);
//  2. everything coloured reads `var(--fc-<key>,var(--fc-<key>-l))`, so it is
//     light unless `--fc-<key>` is set;
//  3. `--fc-<key>` is set to the dark value by EITHER
//     - the `dark:` classes below, compiled by the consumer's Tailwind from
//       react-fancy's dist, so they follow the consumer's own `dark` variant
//       (class strategy, `dark-variant.css`, or the default media query), or
//     - the zero-specificity rule in `styles.css` keyed on
//       `[data-react-fancy-code-palette]` under `.dark` / `[data-theme="dark"]`,
//       for a host whose Tailwind does not scan this package.
//     Together they cover what the old hook followed: `.dark` OR the media
//     query (the latter through Tailwind's default `dark` variant).
//
// The class strings MUST stay literal: Tailwind finds them by scanning dist.

/** The palette slots CodeBlock and CodeView paint. */
export const CODE_PALETTE_KEYS = [
  "background",
  "foreground",
  "gutterBackground",
  "gutterForeground",
  "gutterBorder",
  "cursorColor",
  "keyword",
  "string",
  "comment",
  "number",
  "operator",
  "function",
  "type",
  "tag",
  "attribute",
  "attributeValue",
  "punctuation",
  "variable",
] as const satisfies readonly ThemeColorKey[];

export type CodePaletteKey = (typeof CODE_PALETTE_KEYS)[number];

/** One `dark:` class per key in `CODE_PALETTE_KEYS`; a test keeps them in step. */
export const CODE_PALETTE_DARK_CLASS = [
  "dark:[--fc-background:var(--fc-background-d)]",
  "dark:[--fc-foreground:var(--fc-foreground-d)]",
  "dark:[--fc-gutterBackground:var(--fc-gutterBackground-d)]",
  "dark:[--fc-gutterForeground:var(--fc-gutterForeground-d)]",
  "dark:[--fc-gutterBorder:var(--fc-gutterBorder-d)]",
  "dark:[--fc-cursorColor:var(--fc-cursorColor-d)]",
  "dark:[--fc-keyword:var(--fc-keyword-d)]",
  "dark:[--fc-string:var(--fc-string-d)]",
  "dark:[--fc-comment:var(--fc-comment-d)]",
  "dark:[--fc-number:var(--fc-number-d)]",
  "dark:[--fc-operator:var(--fc-operator-d)]",
  "dark:[--fc-function:var(--fc-function-d)]",
  "dark:[--fc-type:var(--fc-type-d)]",
  "dark:[--fc-tag:var(--fc-tag-d)]",
  "dark:[--fc-attribute:var(--fc-attribute-d)]",
  "dark:[--fc-attributeValue:var(--fc-attributeValue-d)]",
  "dark:[--fc-punctuation:var(--fc-punctuation-d)]",
  "dark:[--fc-variable:var(--fc-variable-d)]",
].join(" ");

/** Marks the element that declares the palette; styles.css keys its dark rule on it. */
export const CODE_PALETTE_ATTR = "data-react-fancy-code-palette";

/**
 * fancy-file-commons' palettes with the syntax tokens raised to WCAG AA
 * (4.5:1 on the code background) where they fell short. Measured by the lab's
 * full-kit benchmark (finding K9, 2026-11-11): eight light tokens were 2.56 to
 * 4.23:1 on #ffffff, and the dark comment 3.67:1 on #18181b. Backgrounds and
 * chrome are unchanged. tests/code-palette-contrast.test.ts measures every
 * token in both palettes.
 */
export const CODE_LIGHT_COLORS = {
  ...LIGHT_COLORS,
  keyword: "#7c3aed", // 5.70:1 (was #8b5cf6, 4.23)
  string: "#047857", // 5.48:1 (was #059669, 3.77)
  comment: "#6b7280", // 4.83:1 (was #94a3b8, 2.56)
  number: "#b45309", // 5.02:1 (was #d97706, 3.19)
  operator: "#0e7490", // 5.36:1 (was #0891b2, 3.68)
  type: "#b45309", // 5.02:1 (was #d97706, 3.19)
  attribute: "#b45309", // 5.02:1 (was #d97706, 3.19)
  attributeValue: "#047857", // 5.48:1 (was #059669, 3.77)
} as const satisfies typeof LIGHT_COLORS;

export const CODE_DARK_COLORS = {
  ...DARK_COLORS,
  comment: "#8e8e98", // 5.46:1 (was #71717a, 3.67); still dimmer than punctuation
} as const satisfies typeof DARK_COLORS;

const ALL_VARIABLES = themeVariables(CODE_LIGHT_COLORS, CODE_DARK_COLORS);

/** Both palettes as custom properties, for the root's `style`. */
export const CODE_PALETTE_STYLE: CSSProperties = Object.fromEntries(
  CODE_PALETTE_KEYS.flatMap((key) => [
    [`--fc-${key}-l`, ALL_VARIABLES[`--fc-${key}-l`]],
    [`--fc-${key}-d`, ALL_VARIABLES[`--fc-${key}-d`]],
  ]),
) as CSSProperties;

/** The CSS value for palette slot `key`: dark under the dark switch, light otherwise. */
export function paletteColor(key: CodePaletteKey): string {
  return themeColorVar(key);
}

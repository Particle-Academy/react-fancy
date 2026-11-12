/**
 * Semantic theme tokens — the small set of colours the kit's DOM components
 * read, so a host can repaint the whole kit with its own palette WITHOUT
 * remapping Tailwind's `zinc` or `violet`.
 *
 * Each role is two CSS custom properties, one per mode:
 *
 *   --fancy-surface        the light value
 *   --fancy-surface-dark   the dark value
 *
 * Components read them through their var() FALLBACK, which is the colour the
 * component used before these existed:
 *
 *   bg-[color:var(--fancy-surface,var(--color-white))]
 *     dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]
 *
 * So:
 *  - **Set nothing and nothing changes.** An unset custom property resolves to
 *    its fallback, which is the exact declaration the old `bg-white` produced.
 *  - **Set one and every surface follows**, wherever the variable is in scope:
 *    `:root`, `body`, or any wrapper element. No selector to match, no layer or
 *    specificity to win — a custom property is inherited, not cascaded against.
 *  - **Both modes are stated, not derived.** The dark value is a separate
 *    variable rather than a flip under `.dark`, so which one applies is decided
 *    by the host's own `dark:` variant — the same switch that drives every
 *    other `dark:` utility in the kit. (See `dark-variant.css` for a variant
 *    that follows `[data-theme="dark"]` as well as `.dark`.)
 *
 * NOT covered, deliberately: colours that ENCODE DATA — chart series,
 * file-type marks, mood and confidence scales, event kinds. Repainting those
 * with a host's neutral palette would erase what they mean. A component's
 * explicit `color` prop (Badge, Button, Callout …) is also untouched: that is
 * the host choosing a hue, not the kit choosing one for it.
 *
 * `light` / `dark` are the defaults exactly as components write them in their
 * fallbacks. `tests/theme-tokens.test.tsx` fails if a component's fallback
 * disagrees with this table, so the table is the contract rather than a
 * description of it.
 */
export const THEME_TOKENS = {
  surface: {
    variable: "--fancy-surface",
    darkVariable: "--fancy-surface-dark",
    light: "var(--color-white)",
    dark: "var(--color-zinc-900)",
    description: "Panels, cards, overlays (menus, modals, popovers, toasts), sidebars and navbars.",
  },
  "surface-muted": {
    variable: "--fancy-surface-muted",
    darkVariable: "--fancy-surface-muted-dark",
    light: "var(--color-zinc-100)",
    dark: "var(--color-zinc-800)",
    description: "Hovered and selected rows, chips, inset wells, toolbar buttons.",
  },
  border: {
    variable: "--fancy-border",
    darkVariable: "--fancy-border-dark",
    light: "var(--color-zinc-200)",
    dark: "var(--color-zinc-700)",
    description: "Outlines, dividers, separators and tracks (skeletons, progress, sliders).",
  },
  "border-strong": {
    variable: "--fancy-border-strong",
    darkVariable: "--fancy-border-strong-dark",
    // zinc-500 in BOTH modes since 6.15.0 (WCAG 1.4.11, 3:1 non-text): 4.83:1
    // on the white field, 3.44:1 on the #1e1e24 dark field. The old defaults,
    // zinc-300 / zinc-700, were 1.48:1 / 1.59:1.
    light: "var(--color-zinc-500)",
    dark: "var(--color-zinc-500)",
    description:
      "The resting outline of drawn form controls (inputs, selects, pickers, the off switch track). zinc-500 in both modes since 6.15.0, for 3:1 non-text contrast. Native checkboxes and radios are drawn by the browser and do not read it.",
  },
  input: {
    variable: "--fancy-input",
    darkVariable: "--fancy-input-dark",
    light: "var(--color-white)",
    dark: "#1e1e24",
    description: "The field surface of text inputs, checkboxes, radios, OTP cells and pickers.",
  },
  text: {
    variable: "--fancy-text",
    darkVariable: "--fancy-text-dark",
    light: "var(--color-zinc-900)",
    dark: "var(--color-zinc-100)",
    description: "Strongest foreground: headings, values, field text, active items.",
  },
  "text-soft": {
    variable: "--fancy-text-soft",
    darkVariable: "--fancy-text-soft-dark",
    light: "var(--color-zinc-700)",
    dark: "var(--color-zinc-300)",
    description: "Body copy and menu items: readable, one step back from text.",
  },
  "text-muted": {
    variable: "--fancy-text-muted",
    darkVariable: "--fancy-text-muted-dark",
    light: "var(--color-zinc-500)",
    dark: "var(--color-zinc-400)",
    description: "Descriptions, captions, secondary labels, axis labels.",
  },
  "text-faint": {
    variable: "--fancy-text-faint",
    darkVariable: "--fancy-text-faint-dark",
    light: "var(--color-zinc-400)",
    dark: "var(--color-zinc-500)",
    description: "Placeholders, disabled hints, decorative icons.",
  },
  "text-subtle": {
    variable: "--fancy-text-subtle",
    darkVariable: "--fancy-text-subtle-dark",
    light: "var(--color-zinc-600)",
    dark: "var(--color-zinc-400)",
    description: "Inactive nav labels (Sidebar, Menu, Navbar, MultiSwitch) and secondary prose. Added 5.53.1.",
  },
  "surface-hover": {
    variable: "--fancy-surface-hover",
    darkVariable: "--fancy-surface-hover-dark",
    light: "var(--color-zinc-50)",
    // Tailwind's `bg-zinc-800/50`, written out so a host's value is used as-is.
    dark: "color-mix(in oklab, var(--color-zinc-800) 50%, transparent)",
    description: "The hover fill on nav items, list options and table rows. Added 5.53.1.",
  },
  focus: {
    variable: "--fancy-focus",
    darkVariable: "--fancy-focus-dark",
    light: "var(--color-blue-500)",
    dark: "var(--color-blue-400)",
    description: "The focus border and ring on form controls.",
  },
  accent: {
    variable: "--fancy-accent",
    darkVariable: "--fancy-accent-dark",
    light: "var(--color-blue-600)",
    // blue-500, not blue-600: blue-600 is 2.84:1 on zinc-800, under WCAG 1.4.11's 3:1. Since 6.18.1.
    dark: "var(--color-blue-500)",
    description:
      "The checked colour (`accent-color`) of native checkboxes and radios: Checkbox, CheckboxGroup, RadioGroup. Added 6.18.0; dark default blue-500 since 6.18.1.",
  },
  error: {
    variable: "--fancy-error",
    darkVariable: "--fancy-error-dark",
    // Text, so 4.5:1 (WCAG 1.4.3): red-600 is 4.77:1 on white; red-400 is
    // 5.74:1 on #1e1e24, 6.13:1 on zinc-900 and 5.16:1 on zinc-800.
    light: "var(--color-red-600)",
    dark: "var(--color-red-400)",
    description:
      "Validation text: the error message and required asterisk of Field (and every input that wraps it), Checkbox and Switch. Added 6.19.0 (CC-fancy-0018).",
  },
  success: {
    variable: "--fancy-success",
    darkVariable: "--fancy-success-dark",
    // The fill ChatThread's accept button already painted. White on it is
    // 5.36:1 (emerald-700) and 7.61:1 (emerald-800), over 4.5:1 in both modes.
    light: "var(--color-emerald-700)",
    dark: "var(--color-emerald-800)",
    description:
      "The positive / accept fill: ChatThread's proposal accept button and JsonEditor's staged-edit accept. Its border and hover follow it. Pair with `on-success`. Added in Unreleased.",
  },
  "on-success": {
    variable: "--fancy-on-success",
    darkVariable: "--fancy-on-success-dark",
    light: "var(--color-white)",
    dark: "var(--color-white)",
    description:
      "Text and icons on the `success` fill. Keep it at 4.5:1 against `success` in each mode. Added in Unreleased.",
  },
} as const;

export type ThemeTokenRole = keyof typeof THEME_TOKENS;

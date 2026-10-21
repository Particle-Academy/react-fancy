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
    light: "var(--color-zinc-300)",
    dark: "var(--color-zinc-700)",
    description: "The firmer outline on form controls (inputs, checkboxes, radios) and keycaps.",
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
  focus: {
    variable: "--fancy-focus",
    darkVariable: "--fancy-focus-dark",
    light: "var(--color-blue-500)",
    dark: "var(--color-blue-400)",
    description: "The focus border and ring on form controls.",
  },
} as const;

export type ThemeTokenRole = keyof typeof THEME_TOKENS;

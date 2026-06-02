export type Size = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * The full Tailwind v4 named color palette — every default hue, including all
 * five gray families. Components that accept a `color` should type it as this
 * so the whole palette is available.
 */
export type Color =
  // grays
  | "slate"
  | "gray"
  | "zinc"
  | "neutral"
  | "stone"
  // hues
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

/** Every value of {@link Color}, for building exhaustive class maps. */
export const COLORS = [
  "slate", "gray", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
] as const satisfies readonly Color[];

export type Variant = "solid" | "outline" | "ghost" | "soft";

export type ButtonColor =
  | "blue"
  | "emerald"
  | "amber"
  | "red"
  | "violet"
  | "indigo"
  | "sky"
  | "rose"
  | "orange"
  | "zinc";

/**
 * @deprecated Renamed to {@link ButtonColor}. `ActionColor` remains as an alias
 * for backward compatibility and will be removed in a future major version.
 */
export type ActionColor = ButtonColor;

export type Placement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end";

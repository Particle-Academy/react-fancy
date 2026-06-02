export type Size = "xs" | "sm" | "md" | "lg" | "xl";

export type Color =
  | "zinc"
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

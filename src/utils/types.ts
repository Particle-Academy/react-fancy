import type { ElementType } from "react";

export type Size = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * What a navigation primitive owes a router.
 *
 * Every nav surface here — `Navbar.Item`, `Sidebar.Item`, `Menu.Item`,
 * `MobileMenu.Item`, `Breadcrumbs.Item` — used to hardcode a plain `<a href>`.
 * That is a FULL PAGE LOAD in every client-routed app, and the only way around
 * it was to nest a router `<Link>` inside the item: an anchor inside an anchor,
 * which is invalid HTML and the same nested-anchor shape that already cost this
 * suite an SSR hydration bug.
 *
 * `as` is the seam {@link ButtonProps.as} already had. It is router-agnostic on
 * purpose — one prop serves Inertia, TanStack Router, React Router and Next
 * rather than a package per router:
 *
 * ```tsx
 * // href-based routers (Inertia, Next)
 * <Navbar.Item as={Link} href="/dashboard">Dashboard</Navbar.Item>
 *
 * // to-based routers (TanStack Router, React Router) — `to` reaches the Link
 * // through the forwarded rest props
 * <Navbar.Item as={Link} to="/dashboard">Dashboard</Navbar.Item>
 * ```
 *
 * Link mode engages on `href` OR `as`, because a `to`-based router never passes
 * an `href` and would otherwise silently render the non-interactive fallback.
 */
export interface NavigableProps {
  /** Target URL. Renders link mode with a plain `<a>` unless `as` is given. */
  href?: string;
  /**
   * Link-mode element override — the component to render INSTEAD of the plain
   * `<a>`, e.g. a router's `<Link>` so navigation happens client-side. Receives
   * `className`, the item's `data-*` handles, and every unrecognized prop, so
   * router-specific props (`to`, `params`, `preload`, `search`) pass straight
   * through. Ignored in button mode.
   */
  as?: ElementType;
}

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

/** Button accepts the full Tailwind v4 palette (alias of {@link Color}). */
export type ButtonColor = Color;

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

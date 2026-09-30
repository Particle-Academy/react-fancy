import type { HTMLAttributes, ReactNode } from "react";

/** Scales the card's padding and its corner radius. */
export type CardSize = "xs" | "sm" | "md" | "lg";

/**
 * The inset applied to the card's direct children.
 *
 * Separate from `CardSize` because they are separate keys: `size` only picks
 * the DEFAULT step, and `padding` overrides it. Anything that has to line up
 * with the content's edge — an inset divider, a `Card.Bleed` — is keyed by this
 * and never by `size`.
 */
export type CardPadding = "none" | "xs" | "sm" | "md" | "lg";

/**
 * How `Card.Header` / `Card.Body` / `Card.Footer` are set apart.
 *
 * `"divided"` is the default because it is what Card has always rendered.
 * Seamless is arguably the nicer default — it is what Flux chose — but making
 * it the default here would have silently restyled every card in every
 * consumer, which is not a thing a minor release may do.
 */
export type CardSections = "divided" | "plain" | "banded";

/** Which of the card's edges a `Card.Bleed` reaches. */
export type CardBleedEdges = "x" | "top" | "bottom" | "all";

export interface CardContextValue {
  size: CardSize;
  /**
   * The step the card ACTUALLY pads its children by, after `padding` has had
   * its say over `size`. Parts that must meet the content's edge read this.
   */
  padding: CardPadding;
  sections: CardSections;
  dividerInset: boolean;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The card's surface. `muted` and `soft` are tint steps between `outlined`
   * (no tint) and `flat`.
   */
  variant?: "outlined" | "elevated" | "flat" | "muted" | "soft";
  /**
   * Padding on the card's direct children. Defaults to the step implied by
   * `size`; pass it to override that, including `"none"`.
   */
  padding?: CardPadding;
  /** Scales padding and corner radius together. Default `"md"`. */
  size?: CardSize;
  /** How the header, body and footer are separated. Default `"divided"`. */
  sections?: CardSections;
  /**
   * With `sections="divided"`, stop the rules at the content's edge instead of
   * running them across the card.
   */
  dividerInset?: boolean;
  /**
   * A faint hairline along the inside of the top edge — white at 70% in light
   * mode, white at 10% in dark, so a tinted or elevated surface reads as lit
   * from above in both.
   *
   * Default `false`, deliberately unlike Flux's `true` — flipping a decorative
   * hairline on by default would change the appearance of every existing card.
   */
  highlight?: boolean;
  /**
   * Card is a link or a grid tile: adds the hover lift + border/shadow
   * response, and clips children to the rounded corners so a `Card.Media`
   * sits flush.
   */
  interactive?: boolean;
}

export interface CardMediaProps extends HTMLAttributes<HTMLDivElement> {
  /** Image URL. Omit for a pure colour/gradient tile. */
  src?: string;
  alt?: string;
  /** CSS `aspect-ratio`. Default `"16/9"`. Ignored when `height` is set. */
  ratio?: string;
  /** Fixed height instead of an aspect ratio. */
  height?: number | string;
  /**
   * Shown UNDER the image — while it loads, and permanently if it never
   * arrives. Any CSS background value, so a gradient works.
   */
  background?: string;
  /** `object-position` for the image. Default `"center"`. */
  objectPosition?: string;
  loading?: "lazy" | "eager";
  /** Slots pinned to the media's corners — a number chip, a status pill. */
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
}

/**
 * Shared by `Card.Header` and `Card.Footer`.
 *
 * `heading` / `description` / `actions` exist so the common header does not
 * need a layout wrapper from the caller. Two pages in this suite's own showcase
 * were writing `<div style={{ display: "flex", justifyContent: "space-between"
 * }}>` INSIDE a `Card.Header` — inline styles, in the app whose job is to
 * demonstrate the kit. 136 headers there, and nothing in the kit laid one out.
 *
 * `children` is the escape hatch and it WINS: pass it and the three props are
 * ignored rather than rendered alongside, so a caller who sets both gets one
 * title instead of two.
 */
export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** The title. Rendered through `<Heading>`. */
  heading?: ReactNode;
  /** Which heading element to render. Default `"h3"`. */
  headingLevel?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Supporting line under the heading. Rendered through muted `<Text>`. */
  description?: ReactNode;
  /** Controls pushed to the far end, vertically centred on the heading. */
  actions?: ReactNode;
  /**
   * Only used when there is no `Card` above this — a standalone header takes
   * its own size, because there is no card to inherit one from.
   */
  size?: CardSize;
  /** Full control. Replaces heading/description/actions, keeps the frame. */
  children?: ReactNode;
}

export interface CardHeaderProps extends CardSectionProps {}

export interface CardFooterProps extends CardSectionProps {}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export interface CardBleedProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Which card edges to reach. Default `"x"` — the sides only, which is what
   * an inline image or table wants.
   */
  edges?: CardBleedEdges;
}

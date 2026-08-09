import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "outlined" | "elevated" | "flat";
  padding?: "none" | "sm" | "md" | "lg";
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

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

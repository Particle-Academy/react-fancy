import type { CardPadding, CardSize } from "./Card.types";

/**
 * One table per thing a `size` or a `padding` step scales.
 *
 * They live together, and apart from the components, because four of them have
 * to agree: the card's own radius, `Card.Media`'s top radius, the inset a
 * `dividerInset` rule stops at, and the negative margin a `Card.Bleed` uses to
 * escape. Those last three are all derived from the PADDING step — get one
 * wrong and the mismatch is a few pixels, which is the kind of defect that
 * survives review and then looks like a browser bug.
 *
 * Radius is keyed by `size`; everything that has to line up with the padding is
 * keyed by the padding step. Those are NOT the same key: `size` only picks the
 * DEFAULT padding, and an explicit `padding` prop overrides it. Keying the
 * inset and the bleed off `size` made `<Card size="md" padding="lg">` draw a
 * rule inset by 1rem over content inset by 1.5rem, and `padding="none"` pull a
 * bleed clean outside the card.
 *
 * **`md` must stay byte-identical to what Card rendered before `size` existed**
 * (`rounded-lg`, `px-4`, `py-3`). `size` defaults to `md`, so that is what
 * makes this whole feature additive rather than a restyle of every consumer.
 */

export const paddingClasses: Record<CardPadding, string> = {
  none: "",
  xs: "[&>*]:px-2 [&>*]:py-1.5",
  sm: "[&>*]:px-3 [&>*]:py-2",
  md: "[&>*]:px-4 [&>*]:py-3",
  lg: "[&>*]:px-6 [&>*]:py-4",
};

/** The padding step a `size` implies when `padding` is not given. */
export const sizePadding: Record<CardSize, CardPadding> = {
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
};

export const radiusClasses: Record<CardSize, string> = {
  xs: "rounded",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
};

/** `rounded-t-*` / `rounded-b-*` counterparts, for media and bleed. */
export const radiusTop: Record<CardSize, string> = {
  xs: "rounded-t",
  sm: "rounded-t-md",
  md: "rounded-t-lg",
  lg: "rounded-t-xl",
};

export const radiusBottom: Record<CardSize, string> = {
  xs: "rounded-b",
  sm: "rounded-b-md",
  md: "rounded-b-lg",
  lg: "rounded-b-xl",
};

/** Padding a STANDALONE header/footer applies to itself, having no card. */
export const selfPadding: Record<CardPadding, string> = {
  none: "",
  xs: "px-2 py-1.5",
  sm: "px-3 py-2",
  md: "px-4 py-3",
  lg: "px-6 py-4",
};

/**
 * Where an inset divider stops — matches the horizontal padding step.
 *
 * Written out per variant rather than composed as `` `after:${insetX[step]}` ``.
 * **Tailwind generates CSS by scanning source for LITERAL class names**, so a
 * template string produces a class that exists in the DOM and in no stylesheet:
 * the divider silently does not render, and nothing in the build complains. The
 * duplication is the price of the scanner being a text search, and
 * `tests/card-tailwind.test.ts` compiles every one of these through Tailwind so
 * a typo cannot pass either.
 */
export const dividerInsetAfter: Record<CardPadding, string> = {
  none: "after:inset-x-0",
  xs: "after:inset-x-2",
  sm: "after:inset-x-3",
  md: "after:inset-x-4",
  lg: "after:inset-x-6",
};

export const dividerInsetBefore: Record<CardPadding, string> = {
  none: "before:inset-x-0",
  xs: "before:inset-x-2",
  sm: "before:inset-x-3",
  md: "before:inset-x-4",
  lg: "before:inset-x-6",
};

/**
 * Negative margins a nested `Card.Bleed` uses to reach the card's edges.
 *
 * `none` is empty on purpose: with no padding to escape, a negative margin
 * would drag the content OUT of the card rather than to its edge.
 */
export const bleedX: Record<CardPadding, string> = {
  none: "",
  xs: "-mx-2",
  sm: "-mx-3",
  md: "-mx-4",
  lg: "-mx-6",
};

export const bleedTop: Record<CardPadding, string> = {
  none: "",
  xs: "-mt-1.5",
  sm: "-mt-2",
  md: "-mt-3",
  lg: "-mt-4",
};

export const bleedBottom: Record<CardPadding, string> = {
  none: "",
  xs: "-mb-1.5",
  sm: "-mb-2",
  md: "-mb-3",
  lg: "-mb-4",
};

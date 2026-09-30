import { forwardRef, useMemo } from "react";
import { cn } from "../../utils/cn";
import { CardHeader } from "./CardHeader";
import { CardBody } from "./CardBody";
import { CardFooter } from "./CardFooter";
import { CardMedia } from "./CardMedia";
import { CardBleed } from "./CardBleed";
import { CardContext } from "./Card.context";
import { paddingClasses, radiusClasses, sizePadding } from "./Card.scales";
import type { CardContextValue, CardProps } from "./Card.types";

const variantClasses: Record<NonNullable<CardProps["variant"]>, string> = {
  outlined: "border border-zinc-200 dark:border-zinc-700",
  elevated: "shadow-md border border-zinc-100 dark:border-zinc-800",
  flat: "bg-zinc-50 dark:bg-zinc-800/50",
  // Tint steps between "no tint" and `flat`. They work the same way `flat`
  // does: a later `bg-*` in the class string beats the base `bg-white`, because
  // `cn` is tailwind-merge and resolves conflicting utilities last-wins. Class
  // ORDER decides this, not CSS specificity — so these must stay after the base
  // background in the `cn(...)` call below.
  muted: "bg-zinc-100 dark:bg-zinc-800",
  soft: "bg-zinc-50/70 dark:bg-zinc-800/40",
};

/**
 * Padding is applied to the card's DIRECT CHILDREN rather than the card
 * itself, so a full-bleed child (`Card.Media`) can opt out with `!px-0`
 * without having to undo a padding that is already baked into the frame.
 *
 * The selector is `&>*`, not `&>div`. It was `&>div` until 5.24.0, which meant
 * the tag a caller happened to choose silently decided whether that child was
 * padded: `<Card><div>a</div><p>b</p></Card>` inset the div and left the
 * paragraph hard against the border. Nothing in the caller's code hinted at
 * the rule, and the result read as a bug in the card.
 *
 * It is also why there is no `gap` to scale with `size`, which looks like an
 * omission and is not: each direct child carries its own `py-*`, so two
 * adjacent parts already have twice that between their content. Adding a row
 * gap on the card would double a space that is already there.
 */

const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "outlined",
      size = "md",
      padding,
      sections = "divided",
      dividerInset = false,
      highlight = false,
      interactive = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    // `padding` stays authoritative over the step `size` implies. That order is
    // what keeps `size` additive: a caller already passing `padding` sees no
    // change, and `padding="none"` still means none.
    const resolvedPadding = padding ?? sizePadding[size];

    // The RESOLVED step goes into the context, not `size`. A part that has to
    // meet the content's edge — an inset divider, a `Card.Bleed` — needs the
    // distance the card actually applied, and `size` is only the default.
    const context = useMemo<CardContextValue>(
      () => ({ size, padding: resolvedPadding, sections, dividerInset }),
      [size, resolvedPadding, sections, dividerInset],
    );

    return (
      <CardContext.Provider value={context}>
        <div
          ref={ref}
          data-react-fancy-card=""
          className={cn(
            "bg-white dark:bg-zinc-900",
            radiusClasses[size],
            variantClasses[variant],
            // A pseudo-element rather than an inset box-shadow: `shadow-*` and
            // `shadow-[inset...]` are the same tailwind-merge group, so an
            // inset shadow here would have SILENTLY DELETED `elevated`'s
            // `shadow-md`. Highlight and elevation have to be able to coexist.
            // `dark:` carries a REAL colour. It was `dark:before:bg-transparent`,
            // which made `highlight` a no-op in the mode that needs it most:
            // a dark surface has no border contrast of its own, and a 10% white
            // top edge is the whole reason Flux turns this on by default.
            highlight &&
              "relative before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/70 dark:before:bg-white/10",
            // `overflow-hidden` is part of `interactive` rather than always-on:
            // clipping unconditionally would cut off popovers and dropdowns that
            // legitimately overflow a static card.
            interactive &&
              "overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-600",
            paddingClasses[resolvedPadding],
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </CardContext.Provider>
    );
  },
);

CardRoot.displayName = "Card";

export const Card = Object.assign(CardRoot, {
  Media: CardMedia,
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Bleed: CardBleed,
});

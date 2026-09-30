import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { useCardContext, useCardSectionPadding } from "./Card.context";
import { bleedBottom, bleedTop, bleedX, radiusBottom, radiusTop } from "./Card.scales";
import type { CardBleedProps } from "./Card.types";

/**
 * Run content out to the card's edges — an image, a table, a chart strip.
 *
 * ## Why this is arithmetic and not a CSS-variable protocol
 *
 * Flux solves the same problem with a published set of custom properties
 * (`--flux-bleed-x`, `--flux-bleed-top`, …) that any child component may read.
 * It has to: its padding sits on the CARD, so a descendant has no way to know
 * how far it must reach. That is a public CSS API — a cross-package contract to
 * version forever.
 *
 * Ours does not need one, because padding sits on the card's direct CHILDREN.
 * The distance to the edge is therefore always one padding step, which the
 * padded section passes down in context. No variables, nothing for a consumer
 * to depend on, nothing to keep stable across releases.
 *
 * ## Two cases, and they are opposites
 *
 * - **Inside a `Card.Header` / `Card.Body` / `Card.Footer`** (the normal case):
 *   the padding is on that section, so reaching the edge is a NEGATIVE MARGIN.
 * - **As a direct child of `Card`**: the padding is on this element, so
 *   reaching the edge is ZEROING it. A negative margin here would pull the
 *   content clean outside the card.
 *
 * A component cannot see its own depth, so the sections publish their padding
 * step in context and its absence means "you are the padded element". Both
 * cases read as "cancel the padding", which is exactly why picking either one
 * alone ships looking correct in whichever demo the author happened to write.
 *
 * The distance comes from that context and NOT from the card's `size`, because
 * the two disagree whenever `padding` is passed explicitly — and disagree by a
 * whole step, which looks like a rendering bug rather than a prop conflict.
 *
 * Corners are rounded only where the content actually meets the card's edge, so
 * a mid-body strip stays square while one at the top follows the card's radius.
 */
export const CardBleed = forwardRef<HTMLDivElement, CardBleedProps>(
  ({ edges = "x", className, children, ...props }, ref) => {
    const card = useCardContext();
    const section = useCardSectionPadding();
    // Radius follows the CARD (that is whose corners are being met); the
    // distance follows the PADDING.
    const size = card?.size ?? "md";

    const touchesTop = edges === "top" || edges === "all";
    const touchesBottom = edges === "bottom" || edges === "all";

    return (
      <div
        ref={ref}
        data-react-fancy-card-bleed=""
        className={cn(
          // Clip children to whatever corners we round, or an image's square
          // edge sits over the card's curve.
          "overflow-hidden",
          section !== null
            ? cn(
                bleedX[section],
                touchesTop && bleedTop[section],
                touchesBottom && bleedBottom[section],
              )
            : // Direct child of the card: `!` because the padding it is undoing
              // comes from the card's own `[&>*]` rule, which is equally
              // specific. Same mechanism `Card.Media` uses.
              cn(
                "!px-0",
                touchesTop && "!pt-0",
                touchesBottom && "!pb-0",
              ),
          touchesTop && radiusTop[size],
          touchesBottom && radiusBottom[size],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardBleed.displayName = "CardBleed";

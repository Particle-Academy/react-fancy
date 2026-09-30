import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Heading } from "../Heading/Heading";
import { Text } from "../Text/Text";
import { CardSectionContext, useCardContext } from "./Card.context";
import { dividerInsetAfter, dividerInsetBefore, selfPadding, sizePadding } from "./Card.scales";
import type { CardSectionProps } from "./Card.types";

/**
 * The shared body of `Card.Header` and `Card.Footer`.
 *
 * They differ in exactly ONE way — which edge the rule sits on — so they are
 * one implementation with an `edge` argument rather than two files that have to
 * be kept in step. Composition, including where a lone `actions` block lands,
 * is identical in both. The previous pair had already drifted from
 * `ModalFooter`, which lays its actions out with `flex items-center
 * justify-end gap-3` while `Card.Footer` laid out nothing.
 */
export interface CardSectionInternalProps extends CardSectionProps {
  edge: "top" | "bottom";
  handle: string;
}

export const CardSection = forwardRef<HTMLDivElement, CardSectionInternalProps>(
  (
    {
      edge,
      handle,
      heading,
      headingLevel = "h3",
      description,
      actions,
      size: sizeProp,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const card = useCardContext();

    // No card above us means this is a standalone section — a heading ABOVE a
    // card, which Flux supports and we rendered wrongly: it kept the rule that
    // belongs to a card it was not inside. Standalone also has to pad itself,
    // because the padding normally comes from the card's `[&>*]` rule.
    const standalone = card === null;
    const size = card?.size ?? sizeProp ?? "md";
    const sections = card?.sections ?? "plain";
    const dividerInset = card?.dividerInset ?? false;

    // The step the content is inset by, whoever applied it — the card's
    // `[&>*]` rule, or this element's own padding when standalone. An inset
    // rule has to stop exactly there, and a nested `Card.Bleed` has to travel
    // exactly that far back out, so both read this one value.
    const padding = card?.padding ?? sizePadding[size];

    const ruled = sections === "divided";
    const banded = sections === "banded";

    // Children WIN. Rendering both would give anyone who passed each by mistake
    // two titles, and silently ignoring children would be worse.
    const composed = children ?? null;
    const hasComposition = composed === null && (heading != null || description != null || actions != null);

    return (
      <div
        ref={ref}
        {...{ [handle]: "" }}
        className={cn(
          standalone && selfPadding[padding],
          banded && "bg-zinc-50 dark:bg-zinc-800/50",
          ruled &&
            !dividerInset &&
            (edge === "bottom"
              ? "border-b border-zinc-200 dark:border-zinc-700"
              : "border-t border-zinc-200 dark:border-zinc-700"),
          // An inset rule cannot be a border: a border draws on the element's
          // own edge, and the whole point is to stop short of it. So it is a
          // one-pixel pseudo-element, inset by the same step the padding uses —
          // which is why both come out of one table in Card.scales.
          ruled &&
            dividerInset &&
            cn(
              "relative",
              edge === "bottom"
                ? "after:absolute after:bottom-0 after:h-px after:bg-zinc-200 dark:after:bg-zinc-700"
                : "before:absolute before:top-0 before:h-px before:bg-zinc-200 dark:before:bg-zinc-700",
              edge === "bottom"
                ? dividerInsetAfter[padding]
                : dividerInsetBefore[padding],
            ),
          hasComposition && "flex items-center gap-3",
          hasComposition && (heading != null || description != null ? "justify-between" : "justify-end"),
          className,
        )}
        {...props}
      >
        {/* Padding is on THIS element either way -- from the card's `[&>*]`
            rule, or from `selfPadding` when standalone. A nested `Card.Bleed`
            escapes it with a negative margin in both cases, so the step goes
            down unconditionally; it used to be suppressed when standalone,
            which left a bleed inside a card-less header doing nothing. */}
        <CardSectionContext.Provider value={padding}>
          {composed ?? (
            <>
              {(heading != null || description != null) && (
                <div className="min-w-0">
                  {heading != null && (
                    <Heading
                      as={headingLevel}
                      size="sm"
                      weight="semibold"
                      data-react-fancy-card-heading=""
                    >
                      {heading}
                    </Heading>
                  )}
                  {description != null && (
                    <Text
                      size="sm"
                      color="muted"
                      data-react-fancy-card-description=""
                    >
                      {description}
                    </Text>
                  )}
                </div>
              )}
              {actions != null && (
                <div
                  data-react-fancy-card-actions=""
                  className="flex shrink-0 items-center gap-2"
                >
                  {actions}
                </div>
              )}
            </>
          )}
        </CardSectionContext.Provider>
      </div>
    );
  },
);

CardSection.displayName = "CardSection";

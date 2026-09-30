import { createContext, useContext } from "react";
import type { CardContextValue, CardPadding } from "./Card.types";

/**
 * What a Card tells its parts.
 *
 * `null` is a SUPPORTED state, not an error — unlike `useAccordion`, which
 * throws. `Card.Header` and `Card.Footer` are usable on their own, as a section
 * heading above a card, and before this existed they rendered with a
 * `border-bottom` belonging to a card they were not inside. So the absence of a
 * card is information: it means "style yourself standalone", and it is why this
 * hook returns the value rather than asserting it.
 */
export const CardContext = createContext<CardContextValue | null>(null);

export function useCardContext(): CardContextValue | null {
  return useContext(CardContext);
}

/**
 * The padding step of the section a child sits inside, or `null` when there is
 * no padded section above it.
 *
 * `Card.Bleed` needs it because escaping the padding is two different
 * operations depending on depth, and a component cannot see its own depth:
 *
 *   - Bleed inside a Header/Body/Footer is a GRANDchild of the card — the
 *     padding is on that section, and reaching the card's edge means a negative
 *     margin.
 *   - Bleed as a direct child of the card IS the padded element — the padding
 *     is on Bleed itself, and reaching the edge means zeroing it. A negative
 *     margin here would pull the content outside the card entirely.
 *
 * Both look like "cancel the padding" and neither works for the other case,
 * which is exactly the kind of thing that ships looking fine in one demo.
 *
 * It carries the STEP rather than a boolean because the step is the only thing
 * the bleed actually needs, and it is NOT always derivable from the card's
 * `size`: `<Card size="md" padding="lg">` pads its children by `lg`, and a
 * standalone `Card.Header` has a card-less step of its own. A boolean sent the
 * bleed back to `size` for the distance, which was wrong in both of those
 * cases — by a whole padding step, silently.
 */
export const CardSectionContext = createContext<CardPadding | null>(null);

export function useCardSectionPadding(): CardPadding | null {
  return useContext(CardSectionContext);
}

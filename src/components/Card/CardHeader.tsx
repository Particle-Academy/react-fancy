import { forwardRef } from "react";
import { CardSection } from "./CardSection";
import type { CardHeaderProps } from "./Card.types";

/**
 * A card's header. Also usable on its own, as a section heading above a card —
 * see `CardSection`, which decides that from the absence of a `CardContext`.
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  (props, ref) => (
    <CardSection
      ref={ref}
      edge="bottom"
      handle="data-react-fancy-card-header"
      {...props}
    />
  ),
);

CardHeader.displayName = "CardHeader";

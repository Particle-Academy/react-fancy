import { forwardRef } from "react";
import { CardSection } from "./CardSection";
import type { CardFooterProps } from "./Card.types";

/**
 * A card's footer. Its rule sits on the TOP edge, and a lone `actions` block
 * aligns to the end — matching `ModalFooter`, which has always done that while
 * this component laid out nothing.
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  (props, ref) => (
    <CardSection
      ref={ref}
      edge="top"
      handle="data-react-fancy-card-footer"
      {...props}
    />
  ),
);

CardFooter.displayName = "CardFooter";

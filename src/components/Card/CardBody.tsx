import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { CardSectionContext, useCardContext } from "./Card.context";
import type { CardBodyProps } from "./Card.types";

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => {
    // The step the CARD pads this element by. `"none"` with no card above,
    // because then nothing pads it and there is nothing for a nested
    // `Card.Bleed` to escape.
    const padding = useCardContext()?.padding ?? "none";

    return (
      <div
        ref={ref}
        data-react-fancy-card-body=""
        className={cn(className)}
        {...props}
      >
        {/*
          Body carries no classes of its own -- the card pads it through
          `[&>*]`, and giving it padding here would double that. The context is
          the only thing it adds: it tells a nested `Card.Bleed` that the
          padding to escape is on THIS element, and how much of it there is.
        */}
        <CardSectionContext.Provider value={padding}>{children}</CardSectionContext.Provider>
      </div>
    );
  },
);

CardBody.displayName = "CardBody";

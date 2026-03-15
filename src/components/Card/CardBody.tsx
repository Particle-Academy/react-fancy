import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { CardBodyProps } from "./Card.types";

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-react-fancy-card-body=""
        className={cn(className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardBody.displayName = "CardBody";

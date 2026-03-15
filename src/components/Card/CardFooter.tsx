import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { CardFooterProps } from "./Card.types";

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-react-fancy-card-footer=""
        className={cn(
          "border-t border-zinc-200 dark:border-zinc-700",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardFooter.displayName = "CardFooter";

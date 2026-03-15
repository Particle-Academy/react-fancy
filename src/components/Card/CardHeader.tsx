import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { CardHeaderProps } from "./Card.types";

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-react-fancy-card-header=""
        className={cn(
          "border-b border-zinc-200 dark:border-zinc-700",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardHeader.displayName = "CardHeader";

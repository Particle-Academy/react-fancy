import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { CardHeader } from "./CardHeader";
import { CardBody } from "./CardBody";
import { CardFooter } from "./CardFooter";
import type { CardProps } from "./Card.types";

const variantClasses: Record<NonNullable<CardProps["variant"]>, string> = {
  outlined: "border border-zinc-200 dark:border-zinc-700",
  elevated: "shadow-md border border-zinc-100 dark:border-zinc-800",
  flat: "bg-zinc-50 dark:bg-zinc-800/50",
};

const paddingClasses: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "[&>div]:px-3 [&>div]:py-2",
  md: "[&>div]:px-4 [&>div]:py-3",
  lg: "[&>div]:px-6 [&>div]:py-4",
};

const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "outlined",
      padding = "md",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        data-react-fancy-card=""
        className={cn(
          "rounded-lg bg-white dark:bg-zinc-900",
          variantClasses[variant],
          paddingClasses[padding],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardRoot.displayName = "Card";

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

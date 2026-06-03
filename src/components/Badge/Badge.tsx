import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { BadgeProps } from "./Badge.types";
import { badgeSolid, badgeOutline, badgeSoft, badgeDot } from "./Badge.colors";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;
type BadgeSize = NonNullable<BadgeProps["size"]>;

// Full Tailwind v4 palette — see Badge.colors.ts (generated literal class maps).
const variantMap: Record<BadgeVariant, typeof badgeSoft> = {
  solid: badgeSolid,
  outline: badgeOutline,
  soft: badgeSoft,
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-sm px-2 py-0.5",
  lg: "text-base px-2.5 py-1",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      color = "zinc",
      variant = "soft",
      size = "md",
      dot = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        data-react-fancy-badge=""
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-medium",
          sizeClasses[size],
          variantMap[variant][color],
          className,
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              badgeDot[color],
            )}
          />
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";

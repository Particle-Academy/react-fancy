import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Avatar } from "../Avatar";
import type { ProfileProps } from "./Profile.types";

const gapClasses: Record<NonNullable<ProfileProps["size"]>, string> = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

const nameClasses: Record<NonNullable<ProfileProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

const subtitleClasses: Record<NonNullable<ProfileProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export const Profile = forwardRef<HTMLDivElement, ProfileProps>(
  (
    {
      src,
      alt,
      fallback,
      name,
      subtitle,
      size = "md",
      status,
      className,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        data-react-fancy-profile=""
        className={cn("flex items-center", gapClasses[size], className)}
      >
        <Avatar
          src={src}
          alt={alt || name}
          fallback={fallback}
          size={size}
          status={status}
        />
        <div className="flex min-w-0 flex-col">
          <span
            className={cn(
              "truncate font-medium text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]",
              nameClasses[size],
            )}
          >
            {name}
          </span>
          {subtitle && (
            <span
              className={cn(
                "truncate text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]",
                subtitleClasses[size],
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  },
);

Profile.displayName = "Profile";

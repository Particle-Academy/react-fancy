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
              "truncate font-medium text-zinc-900 dark:text-zinc-100",
              nameClasses[size],
            )}
          >
            {name}
          </span>
          {subtitle && (
            <span
              className={cn(
                "truncate text-zinc-500 dark:text-zinc-400",
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

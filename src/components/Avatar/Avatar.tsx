import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { AvatarProps } from "./Avatar.types";

type AvatarSize = NonNullable<AvatarProps["size"]>;
type AvatarStatus = NonNullable<AvatarProps["status"]>;

const containerSizeClasses: Record<AvatarSize, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const fallbackTextSize: Record<AvatarSize, string> = {
  xs: "text-xs",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const statusSizeClasses: Record<AvatarSize, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-4 w-4",
};

const statusColorClasses: Record<AvatarStatus, string> = {
  online: "bg-green-500",
  offline: "bg-zinc-400",
  busy: "bg-red-500",
  away: "bg-amber-500",
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = "",
      fallback,
      size = "md",
      status,
      className,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        data-react-fancy-avatar=""
        className={cn(
          "relative inline-flex items-center justify-center rounded-full",
          containerSizeClasses[size],
          !src && "bg-zinc-200 dark:bg-zinc-700",
          className,
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            className={cn(
              "font-medium text-zinc-600 dark:text-zinc-300 select-none",
              fallbackTextSize[size],
            )}
          >
            {fallback}
          </span>
        )}
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-zinc-900",
              statusSizeClasses[size],
              statusColorClasses[status],
            )}
          />
        )}
      </div>
    );
  },
);

Avatar.displayName = "Avatar";

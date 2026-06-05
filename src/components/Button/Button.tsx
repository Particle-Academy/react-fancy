import { forwardRef, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { sanitizeHref } from "../../utils/sanitize";
import { resolve } from "../../data/emoji-utils";
import { Icon } from "../Icon/Icon";
import type { ButtonProps } from "./Button.types";
import type { ButtonColor, Size } from "../../utils/types";
import {
  buttonColorClasses as colorClasses,
  buttonGhostClasses as ghostColorClasses,
} from "./Button.colors";

const iconSizeMap: Record<Size, "xs" | "sm" | "md" | "lg" | "xl"> = {
  xs: "xs",
  sm: "xs",
  md: "sm",
  lg: "md",
  xl: "lg",
};

const alertIconSizeMap: Record<Size, "xs" | "sm" | "md" | "lg" | "xl"> = {
  xs: "xs",
  sm: "xs",
  md: "xs",
  lg: "sm",
  xl: "sm",
};

// ---------------------------------------------------------------------------
// Color classes
//
// Solid + ghost color maps live in ./Button.colors (AUTO-GENERATED, all 22
// Tailwind v4 hues as literal strings). The state-color classes below
// (default/active/checked/warn) branch on flags, not specific colors.
// ---------------------------------------------------------------------------

const defaultClasses =
  "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700";

const activeClasses =
  "bg-blue-500 text-white border border-blue-600 hover:bg-blue-600 dark:bg-blue-600 dark:border-blue-500 dark:hover:bg-blue-500";

const checkedClasses =
  "bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-600 dark:bg-emerald-600 dark:border-emerald-500 dark:hover:bg-emerald-500";

const warnClasses =
  "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50";

const ghostDefaultClasses =
  "bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

const ghostActiveClasses =
  "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950";

const ghostCheckedClasses =
  "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950";

const ghostWarnClasses =
  "bg-transparent text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/50";

// ---------------------------------------------------------------------------
// Size helpers
// ---------------------------------------------------------------------------

const horizontalSize: Record<Size, string> = {
  xs: "px-2 py-1 text-xs",
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2.5 text-base",
  xl: "px-5 py-3 text-lg",
};

const circleSize: Record<Size, string> = {
  xs: "w-7 h-7 text-xs",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-14 h-14 text-lg",
};

const iconSize: Record<Size, string> = {
  xs: "w-3 h-3",
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
  xl: "w-6 h-6",
};

const avatarSize: Record<Size, string> = {
  xs: "w-4 h-4",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-7 h-7",
};

const alertIconSize: Record<Size, string> = {
  xs: "w-2 h-2",
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
  lg: "w-4 h-4",
  xl: "w-4 h-4",
};

const badgeSize: Record<Size, string> = {
  xs: "text-[10px] px-1 min-w-[14px] h-3.5",
  sm: "text-[10px] px-1.5 min-w-[16px] h-4",
  md: "text-[11px] px-1.5 min-w-[18px] h-[18px]",
  lg: "text-xs px-2 min-w-[22px] h-5",
  xl: "text-xs px-2 min-w-[24px] h-5",
};

const externalIconOffset: Record<Size, string> = {
  xs: "0.75rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.25rem",
  xl: "1.5rem",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isColored(color?: ButtonColor, active?: boolean, checked?: boolean): boolean {
  return !!(color || active || checked);
}

function getColorClasses(
  color?: ButtonColor,
  active?: boolean,
  checked?: boolean,
  warn?: boolean,
  ghost?: boolean,
): string {
  if (ghost) {
    if (color) return ghostColorClasses[color];
    if (checked) return ghostCheckedClasses;
    if (active) return ghostActiveClasses;
    if (warn) return ghostWarnClasses;
    return ghostDefaultClasses;
  }
  if (color) return colorClasses[color];
  if (checked) return checkedClasses;
  if (active) return activeClasses;
  if (warn) return warnClasses;
  return defaultClasses;
}

function getIconColorClasses(
  color?: ButtonColor,
  active?: boolean,
  checked?: boolean,
  warn?: boolean,
  ghost?: boolean,
): string {
  if (ghost) {
    // Ghost variant: icon inherits currentColor from the button text
    return "text-current";
  }
  if (color || active || checked) return "text-white";
  if (warn) return "text-amber-600 dark:text-amber-400";
  return "text-zinc-500 dark:text-zinc-400";
}

function getBadgeClasses(
  color?: ButtonColor,
  active?: boolean,
  checked?: boolean,
  warn?: boolean,
  ghost?: boolean,
): string {
  if (ghost) {
    return "bg-current/10 text-current";
  }
  if (isColored(color, active, checked)) return "bg-white/20 text-white";
  if (warn) return "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200";
  return "bg-zinc-200 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200";
}

// ---------------------------------------------------------------------------
// Placement parsing
// ---------------------------------------------------------------------------

type PlacementAxis = "left" | "right" | "top" | "bottom";

function parsePlacement(iconPlace: string): { primary: PlacementAxis; secondary?: PlacementAxis } {
  const parts = iconPlace.split(" ") as PlacementAxis[];
  return { primary: parts[0], secondary: parts[1] };
}

function isVerticalPrimary(primary: PlacementAxis): boolean {
  return primary === "top" || primary === "bottom";
}

// ---------------------------------------------------------------------------
// Sort parsing
// ---------------------------------------------------------------------------

type ElementKey = "e" | "i" | "a" | "b";
const DEFAULT_SORT = "eiab";

function parseSortOrder(sort?: string): ElementKey[] {
  const chars = (sort ?? DEFAULT_SORT).split("") as ElementKey[];
  const valid: ElementKey[] = [];
  const seen = new Set<string>();
  for (const c of chars) {
    if ("eiab".includes(c) && !seen.has(c)) {
      valid.push(c);
      seen.add(c);
    }
  }
  // Add missing keys in default order
  for (const c of DEFAULT_SORT.split("") as ElementKey[]) {
    if (!seen.has(c)) valid.push(c);
  }
  return valid;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "default",
      color,
      size = "md",
      active,
      checked,
      warn,
      alert: alertProp,
      icon,
      iconTrailing,
      iconPlace = "left",
      alertIcon,
      alertIconTrailing,
      emoji,
      emojiTrailing,
      avatar,
      avatarTrailing,
      badge,
      badgeTrailing,
      sort,
      loading = false,
      disabled,
      href,
      responsive,
      labelClassName,
      ...props
    },
    ref,
  ) => {
    const isCircle = variant === "circle";
    const isGhost = variant === "ghost";
    const { primary, secondary } = parsePlacement(iconPlace);
    const isVertical = isVerticalPrimary(primary);
    const isCompound = !!secondary;
    const needsWrapper = isVertical || isCompound;
    const isReversed = iconPlace === "right";

    // -----------------------------------------------------------------------
    // Sizing — always use horizontalSize for the button itself
    // -----------------------------------------------------------------------
    const sizeClass = isCircle ? circleSize[size] : horizontalSize[size];

    // -----------------------------------------------------------------------
    // Build decorative elements
    // -----------------------------------------------------------------------
    const iconColorCls = getIconColorClasses(color, active, checked, warn, isGhost);

    const buildElement = (key: ElementKey, trailing: boolean): ReactNode => {
      switch (key) {
        case "e": {
          const slug = trailing ? emojiTrailing : emoji;
          if (!slug) return null;
          const char = resolve(slug);
          if (!char) return null;
          return (
            <span key={`emoji-${trailing ? "t" : "l"}`} data-action-emoji>
              {char}
            </span>
          );
        }
        case "i": {
          if (loading && !trailing) {
            return (
              <span
                key="spinner"
                className={cn("animate-spin border-2 border-current border-t-transparent rounded-full", iconSize[size])}
              />
            );
          }
          const iconSlug = trailing ? iconTrailing : icon;
          if (!iconSlug) return null;
          // For vertical/compound placements, icons render outside the button — not inside
          if (needsWrapper) return null;
          return (
            <span
              key={`icon-${trailing ? "t" : "l"}`}
              className={cn("inline-flex items-center flex-shrink-0", iconColorCls)}
            >
              <Icon name={iconSlug} size={iconSizeMap[size]} />
            </span>
          );
        }
        case "a": {
          if (!avatar) return null;
          const isTrailing = avatarTrailing ?? trailing;
          if (isTrailing !== trailing) return null;
          return (
            <img
              key="avatar"
              src={avatar}
              alt=""
              className={cn(avatarSize[size], "rounded-full object-cover flex-shrink-0")}
              data-action-avatar
            />
          );
        }
        case "b": {
          if (!badge) return null;
          const isTrailing = badgeTrailing ?? trailing;
          if (isTrailing !== trailing) return null;
          return (
            <span
              key="badge"
              className={cn(
                "inline-flex items-center justify-center font-medium rounded-full",
                badgeSize[size],
                getBadgeClasses(color, active, checked, warn, isGhost),
              )}
              data-action-badge
            >
              {badge}
            </span>
          );
        }
        default:
          return null;
      }
    };

    // Alert icon element
    const renderAlertIcon = (trailing: boolean): ReactNode => {
      if (!alertIcon) return null;
      const isTrailing = alertIconTrailing ?? false;
      if (isTrailing !== trailing) return null;
      const alertIconEl = <Icon name={alertIcon} size={alertIconSizeMap[size]} />;
      return (
        <span
          key="alert-icon"
          className="relative inline-flex flex-shrink-0"
          data-action-alert
        >
          <span className="text-red-500 dark:text-red-400 animate-pulse">
            {alertIconEl}
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-red-400 dark:text-red-300 animate-ping opacity-75">
            {alertIconEl}
          </span>
        </span>
      );
    };

    const sortOrder = parseSortOrder(sort);

    const leadingElements: ReactNode[] = [];
    const trailingElements: ReactNode[] = [];

    for (const key of sortOrder) {
      const leading = buildElement(key, false);
      if (leading) leadingElements.push(leading);
      const trailing = buildElement(key, true);
      if (trailing) trailingElements.push(trailing);
    }

    // Insert alert icon
    const leadingAlert = renderAlertIcon(false);
    if (leadingAlert) leadingElements.push(leadingAlert);
    const trailingAlert = renderAlertIcon(true);
    if (trailingAlert) trailingElements.push(trailingAlert);

    // -----------------------------------------------------------------------
    // Classes
    // -----------------------------------------------------------------------
    const classes = cn(
      // `text-left` overrides the UA <button> center default so a wrapped,
      // width-constrained multi-word label stacks left-aligned. Overridable —
      // twMerge lets a `text-center` / `text-right` in `className` win.
      "inline-flex items-center justify-center text-left font-medium transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-offset-1",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      isCircle ? "rounded-full" : "rounded-lg",
      sizeClass,
      getColorClasses(color, active, checked, warn, isGhost),
      !isCircle && !needsWrapper && "gap-2",
      !isCircle && needsWrapper && "gap-2",
      isReversed && !needsWrapper && "flex-row-reverse",
      alertProp && "animate-pulse",
      className,
    );

    // -----------------------------------------------------------------------
    // Content
    // -----------------------------------------------------------------------
    const content = isCircle ? (
      <>
        {loading ? (
          <span
            className={cn(
              "animate-spin border-2 border-current border-t-transparent rounded-full",
              iconSize[size],
            )}
          />
        ) : (
          icon ? <Icon name={icon} size={iconSizeMap[size]} /> : children
        )}
      </>
    ) : (
      <>
        {leadingElements}
        {children != null && (
          <span
            data-react-fancy-button-label=""
            className={cn(
              // min-w-0 lets the label shrink + wrap inside the flex row instead
              // of overflowing and shoving the icon out of place.
              "min-w-0",
              // `responsive` collapses to icon-only when squeezed, while keeping
              // the label readable to screen readers.
              responsive && "sr-only sm:not-sr-only",
              labelClassName,
            )}
          >
            {children}
          </span>
        )}
        {trailingElements}
      </>
    );

    // -----------------------------------------------------------------------
    // Build the button element
    // -----------------------------------------------------------------------
    const safeHref = sanitizeHref(href);
    const buttonEl = safeHref && !disabled ? (
      <a href={safeHref} className={classes} data-react-fancy-button="" data-react-fancy-action="">
        {content}
      </a>
    ) : (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        data-react-fancy-button=""
        data-react-fancy-action=""
        {...props}
      >
        {content}
      </button>
    );

    // -----------------------------------------------------------------------
    // Wrap for vertical/compound icon placement
    // The icon is absolutely positioned so it never shifts the button.
    // -----------------------------------------------------------------------
    if (needsWrapper && (icon || iconTrailing)) {
      const iconSlug = icon ?? iconTrailing;
      const offset = externalIconOffset[size];

      // Determine position styles for the icon
      const posStyle: React.CSSProperties = { position: "absolute" };

      // Primary axis: which side of the button
      if (primary === "top") {
        posStyle.bottom = "100%";
        posStyle.marginBottom = "0.125rem";
      } else if (primary === "bottom") {
        posStyle.top = "100%";
        posStyle.marginTop = "0.125rem";
      } else if (primary === "left") {
        posStyle.right = "100%";
        posStyle.marginRight = "0.125rem";
      } else if (primary === "right") {
        posStyle.left = "100%";
        posStyle.marginLeft = "0.125rem";
      }

      // Secondary axis: cross-axis alignment
      if (isVerticalPrimary(primary)) {
        // Vertical primary → secondary controls horizontal position
        if (secondary === "left") {
          posStyle.left = "0";
        } else if (secondary === "right") {
          posStyle.right = "0";
        } else {
          // center (default)
          posStyle.left = "50%";
          posStyle.transform = "translateX(-50%)";
        }
      } else {
        // Horizontal primary → secondary controls vertical position
        if (secondary === "top") {
          posStyle.top = "0";
        } else if (secondary === "bottom") {
          posStyle.bottom = "0";
        } else {
          // center (default)
          posStyle.top = "50%";
          posStyle.transform = "translateY(-50%)";
        }
      }

      const externalIcon = (
        <span
          className={cn("absolute flex-shrink-0", iconColorCls)}
          style={posStyle}
        >
          <Icon name={iconSlug!} size={iconSizeMap[size]} />
        </span>
      );

      return (
        <span
          data-react-fancy-action-group=""
          className="relative inline-flex"
        >
          {buttonEl}
          {externalIcon}
        </span>
      );
    }

    return buttonEl;
  },
);

Button.displayName = "Button";

/**
 * @deprecated Renamed to {@link Button}. `Action` remains as an alias for
 * backward compatibility and will be removed in a future major version.
 * Prefer importing `Button` from "@particle-academy/react-fancy".
 */
export const Action = Button;

import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import type { AffixPosition } from "./inputs.types";
import type { Size } from "../../utils/types";

interface InputWrapperProps {
  children: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  prefixPosition?: AffixPosition;
  suffixPosition?: AffixPosition;
  size?: Size;
  /** Extra padding className to apply to the input when affixes are "inside" */
  insidePrefixPadding?: string;
  insideSuffixPadding?: string;
}

const insidePaddingLeft: Record<Size, string> = {
  xs: "pl-7",
  sm: "pl-8",
  md: "pl-9",
  lg: "pl-10",
  xl: "pl-11",
};

const insidePaddingRight: Record<Size, string> = {
  xs: "pr-7",
  sm: "pr-8",
  md: "pr-9",
  lg: "pr-10",
  xl: "pr-11",
};

const affixOutsideClasses =
  "inline-flex items-center border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";

export function InputWrapper({
  children,
  prefix,
  suffix,
  prefixPosition = "inside",
  suffixPosition = "inside",
  size = "md",
}: InputWrapperProps) {
  const hasInsidePrefix = prefix && prefixPosition === "inside";
  const hasInsideSuffix = suffix && suffixPosition === "inside";
  const hasOutsidePrefix = prefix && prefixPosition === "outside";
  const hasOutsideSuffix = suffix && suffixPosition === "outside";
  const hasOutside = hasOutsidePrefix || hasOutsideSuffix;

  if (!prefix && !suffix) {
    return <>{children}</>;
  }

  if (hasOutside) {
    return (
      <div data-react-fancy-input-wrapper="" className="flex">
        {hasOutsidePrefix && (
          <span className={cn(affixOutsideClasses, "rounded-l-lg border-r-0")}>
            {prefix}
          </span>
        )}
        <div
          className={cn(
            "relative flex flex-1 items-center",
            hasInsidePrefix && "relative",
          )}
        >
          {hasInsidePrefix && (
            <span className="pointer-events-none absolute left-3 z-10 text-zinc-400 dark:text-zinc-500">
              {prefix}
            </span>
          )}
          <div
            className={cn(
              "w-full [&>*]:w-full",
              hasOutsidePrefix && !hasOutsideSuffix && "[&_input]:rounded-l-none [&_select]:rounded-l-none [&_textarea]:rounded-l-none",
              !hasOutsidePrefix && hasOutsideSuffix && "[&_input]:rounded-r-none [&_select]:rounded-r-none [&_textarea]:rounded-r-none",
              hasOutsidePrefix && hasOutsideSuffix && "[&_input]:rounded-none [&_select]:rounded-none [&_textarea]:rounded-none",
              hasInsidePrefix && `[&_input]:${insidePaddingLeft[size]} [&_select]:${insidePaddingLeft[size]} [&_textarea]:${insidePaddingLeft[size]}`,
            )}
          >
            {children}
          </div>
          {hasInsideSuffix && (
            <span className="pointer-events-none absolute right-3 z-10 text-zinc-400 dark:text-zinc-500">
              {suffix}
            </span>
          )}
        </div>
        {hasOutsideSuffix && (
          <span className={cn(affixOutsideClasses, "rounded-r-lg border-l-0")}>
            {suffix}
          </span>
        )}
      </div>
    );
  }

  // Both inside
  return (
    <div data-react-fancy-input-wrapper="" className="relative flex items-center">
      {hasInsidePrefix && (
        <span className="pointer-events-none absolute left-3 z-10 text-zinc-400 dark:text-zinc-500">
          {prefix}
        </span>
      )}
      <div
        className={cn(
          "w-full",
          hasInsidePrefix && `[&_input]:${insidePaddingLeft[size]} [&_select]:${insidePaddingLeft[size]} [&_textarea]:${insidePaddingLeft[size]}`,
          hasInsideSuffix && `[&_input]:${insidePaddingRight[size]} [&_select]:${insidePaddingRight[size]} [&_textarea]:${insidePaddingRight[size]}`,
        )}
      >
        {children}
      </div>
      {hasInsideSuffix && (
        <span className="pointer-events-none absolute right-3 z-10 text-zinc-400 dark:text-zinc-500">
          {suffix}
        </span>
      )}
    </div>
  );
}

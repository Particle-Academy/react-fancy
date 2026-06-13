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

// NOTE: these must be COMPLETE, static class strings. Tailwind only detects
// utilities it can see verbatim in the source — building the arbitrary variant
// at runtime (e.g. `[&_input]:${"pl-9"}`) means `[&_input]:pl-9` is never
// emitted to CSS, so the inside affix gets no padding and overlaps the text
// (issue #6). Keep input/select/textarea spelled out here.
const insidePaddingLeft: Record<Size, string> = {
  xs: "[&_input]:pl-7 [&_select]:pl-7 [&_textarea]:pl-7",
  sm: "[&_input]:pl-8 [&_select]:pl-8 [&_textarea]:pl-8",
  md: "[&_input]:pl-9 [&_select]:pl-9 [&_textarea]:pl-9",
  lg: "[&_input]:pl-10 [&_select]:pl-10 [&_textarea]:pl-10",
  xl: "[&_input]:pl-11 [&_select]:pl-11 [&_textarea]:pl-11",
};

const insidePaddingRight: Record<Size, string> = {
  xs: "[&_input]:pr-7 [&_select]:pr-7 [&_textarea]:pr-7",
  sm: "[&_input]:pr-8 [&_select]:pr-8 [&_textarea]:pr-8",
  md: "[&_input]:pr-9 [&_select]:pr-9 [&_textarea]:pr-9",
  lg: "[&_input]:pr-10 [&_select]:pr-10 [&_textarea]:pr-10",
  xl: "[&_input]:pr-11 [&_select]:pr-11 [&_textarea]:pr-11",
};

const affixOutsideClasses =
  "inline-flex items-center border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";

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
              hasInsidePrefix && insidePaddingLeft[size],
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
          hasInsidePrefix && insidePaddingLeft[size],
          hasInsideSuffix && insidePaddingRight[size],
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

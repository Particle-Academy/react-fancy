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
// at runtime (e.g. `[&_input]:${"pl-9"}`) means `[&_input]:ps-9` is never
// emitted to CSS, so the inside affix gets no padding and overlaps the text
// (issue #6). Keep input/select/textarea spelled out here.
const insidePaddingLeft: Record<Size, string> = {
  xs: "[&_input]:ps-7 [&_select]:ps-7 [&_textarea]:ps-7",
  sm: "[&_input]:ps-8 [&_select]:ps-8 [&_textarea]:ps-8",
  md: "[&_input]:ps-9 [&_select]:ps-9 [&_textarea]:ps-9",
  lg: "[&_input]:ps-10 [&_select]:ps-10 [&_textarea]:ps-10",
  xl: "[&_input]:ps-11 [&_select]:ps-11 [&_textarea]:ps-11",
};

const insidePaddingRight: Record<Size, string> = {
  xs: "[&_input]:pe-7 [&_select]:pe-7 [&_textarea]:pe-7",
  sm: "[&_input]:pe-8 [&_select]:pe-8 [&_textarea]:pe-8",
  md: "[&_input]:pe-9 [&_select]:pe-9 [&_textarea]:pe-9",
  lg: "[&_input]:pe-10 [&_select]:pe-10 [&_textarea]:pe-10",
  xl: "[&_input]:pe-11 [&_select]:pe-11 [&_textarea]:pe-11",
};

const affixOutsideClasses =
  "inline-flex items-center border border-[color:var(--fancy-border-strong,var(--color-zinc-300))] bg-zinc-50 px-3 text-sm text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-700))] dark:bg-zinc-800 dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]";

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
          <span className={cn(affixOutsideClasses, "rounded-s-lg border-e-0")}>
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
            <span className="pointer-events-none absolute start-3 z-10 text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
              {prefix}
            </span>
          )}
          <div
            className={cn(
              "w-full [&>*]:w-full",
              hasOutsidePrefix && !hasOutsideSuffix && "[&_input]:rounded-s-none [&_select]:rounded-s-none [&_textarea]:rounded-s-none",
              !hasOutsidePrefix && hasOutsideSuffix && "[&_input]:rounded-e-none [&_select]:rounded-e-none [&_textarea]:rounded-e-none",
              hasOutsidePrefix && hasOutsideSuffix && "[&_input]:rounded-none [&_select]:rounded-none [&_textarea]:rounded-none",
              hasInsidePrefix && insidePaddingLeft[size],
            )}
          >
            {children}
          </div>
          {hasInsideSuffix && (
            <span className="pointer-events-none absolute end-3 z-10 text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
              {suffix}
            </span>
          )}
        </div>
        {hasOutsideSuffix && (
          <span className={cn(affixOutsideClasses, "rounded-e-lg border-s-0")}>
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
        <span className="pointer-events-none absolute start-3 z-10 text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
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
        <span className="pointer-events-none absolute end-3 z-10 text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
          {suffix}
        </span>
      )}
    </div>
  );
}

import { createElement, Fragment, type AriaAttributes, type ReactNode } from "react";
import type { Size } from "../../utils/types";
import type { InputOption, OptionDir } from "./inputs.types";

export const inputSizeClasses: Record<Size, string> = {
  xs: "px-2 py-1 text-xs rounded",
  sm: "px-2.5 py-1.5 text-sm rounded-md",
  md: "px-3 py-2 text-sm rounded-lg",
  lg: "px-4 py-2.5 text-base rounded-lg",
  xl: "px-5 py-3 text-lg rounded-xl",
};

export const labelSizeClasses: Record<Size, string> = {
  xs: "text-xs",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
  xl: "text-base",
};

export function dirtyClasses(dirty?: boolean): string {
  return dirty ? "border-s-[3px] border-s-amber-400" : "";
}

export function dirtyRingClasses(dirty?: boolean): string {
  return dirty ? "ring-2 ring-amber-400/50" : "";
}

/**
 * Validation text: the error message and the required asterisk of Field,
 * Checkbox and Switch. Reads the `error` theme token (CC-fancy-0018, 6.19.0);
 * its defaults clear WCAG 1.4.3's 4.5:1 for small text. red-600 is 4.77:1 on
 * white; red-400 is 5.74:1 on #1e1e24, 6.13:1 on zinc-900, 5.16:1 on zinc-800.
 * The old `text-red-500` was 3.81:1 on white and 3.91:1 on zinc-800.
 */
export const ERROR_TEXT =
  "text-[color:var(--fancy-error,var(--color-red-600))] dark:text-[color:var(--fancy-error-dark,var(--color-red-400))]";

export function errorClasses(error?: string): string {
  return error ? "border-red-500 focus:ring-red-500" : "";
}

/**
 * What a control needs to expose its error and description to assistive
 * technology (6.20.0, K1 of the full-kit benchmark). Every form control had
 * rendered its `error` as a plain paragraph: no `aria-invalid`, no
 * `aria-describedby`, nothing announced.
 *
 * `errorId` / `descriptionId` go to `Field` (which renders the message with
 * those ids, the error as `role="alert"`); `aria` goes on the control. The
 * description is only rendered while there is no error, so the control is
 * described by whichever of the two is on screen, after any id the host passed.
 */
export function fieldAria(
  id: string,
  {
    error,
    description,
    describedBy,
    invalid,
  }: {
    error?: unknown;
    description?: unknown;
    /** The host's own `aria-describedby`, kept ahead of the message id. */
    describedBy?: string;
    /** The host's own `aria-invalid` (NumberField, PhoneInput), kept when there is no `error`. */
    invalid?: unknown;
  },
): {
  errorId: string;
  descriptionId: string;
  aria: { "aria-invalid": AriaAttributes["aria-invalid"]; "aria-describedby": string | undefined };
} {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const own = error ? errorId : description ? descriptionId : undefined;
  const ids = [describedBy, own].filter(Boolean).join(" ");
  return {
    errorId,
    descriptionId,
    aria: {
      "aria-invalid": error ? true : (invalid as AriaAttributes["aria-invalid"]),
      "aria-describedby": ids || undefined,
    },
  };
}

export const inputBaseClasses =
  "border border-[color:var(--fancy-border-strong,var(--color-zinc-500))] bg-[color:var(--fancy-input,var(--color-white))] text-[color:var(--fancy-text,var(--color-zinc-900))] placeholder:text-[color:var(--fancy-text-muted,var(--color-zinc-500))] transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-[color:var(--fancy-focus,var(--color-blue-500))]/40 focus:border-[color:var(--fancy-focus,var(--color-blue-500))] disabled:opacity-50 disabled:cursor-not-allowed dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-500))] dark:bg-[color:var(--fancy-input-dark,#1e1e24)] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))] dark:placeholder:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))] dark:focus:border-[color:var(--fancy-focus-dark,var(--color-blue-400))] dark:focus:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]/20";

export function resolveOption<V = string>(
  option: InputOption<V>,
): Exclude<InputOption<V>, string> {
  if (typeof option === "string") {
    return { value: option as unknown as V, label: option };
  }
  return option;
}

/**
 * The `lang` / `dir` attributes for the element holding an option's label.
 * Only the keys that are set, so an option without them renders exactly as it
 * did before 6.13.0.
 */
export function optionLangProps(option: { lang?: string; dir?: OptionDir } | null | undefined): {
  lang?: string;
  dir?: OptionDir;
} {
  const out: { lang?: string; dir?: OptionDir } = {};
  if (option?.lang) out.lang = option.lang;
  if (option?.dir) out.dir = option.dir;
  return out;
}

/**
 * An option's label as a view-mode value: wrapped in a span carrying its
 * `lang` / `dir` when it has them, the bare string otherwise.
 */
export function optionLabelNode(
  option: { label: string; lang?: string; dir?: OptionDir } | null | undefined,
  fallback?: ReactNode,
): ReactNode {
  if (!option) return fallback;
  const attrs = optionLangProps(option);
  return attrs.lang || attrs.dir ? createElement("span", attrs, option.label) : option.label;
}

/**
 * Several labels joined with ", ". Stays one plain string unless an option
 * carries `lang` / `dir`, so existing output does not change.
 */
export function optionLabelList(
  options: Array<{ label: string; lang?: string; dir?: OptionDir } | string>,
): ReactNode {
  const tagged = options.some((o) => typeof o !== "string" && (o.lang || o.dir));
  if (!tagged) return options.map((o) => (typeof o === "string" ? o : o.label)).join(", ");
  return options.map((o, i) =>
    createElement(Fragment, { key: i }, i > 0 ? ", " : null, typeof o === "string" ? o : optionLabelNode(o)),
  );
}

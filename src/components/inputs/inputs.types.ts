import type { ReactNode } from "react";
import type { Size } from "../../utils/types";

/** Text direction of one option's label. */
export type OptionDir = "ltr" | "rtl" | "auto";

export type InputOption<V = string> =
  | string
  | {
      value: V;
      label: string;
      disabled?: boolean;
      description?: string;
      /**
       * BCP 47 language of `label`, when it differs from the page's: a language
       * switcher that names each language in itself (WCAG 3.1.2, language of
       * parts). Rendered as `lang` on the element holding the label, including
       * the selected-value display. Unset renders no attribute.
       */
      lang?: string;
      /**
       * Direction of `label`: `"rtl"` for a right-to-left script inside a
       * left-to-right control. `"auto"` is available; nothing is added when
       * unset.
       */
      dir?: OptionDir;
    };

export type InputOptionGroup<V = string> = {
  label: string;
  options: InputOption<V>[];
};

/**
 * Edit vs. read-only display. In `"view"` mode an input renders the bound value
 * as static text instead of an interactive control — the React/Inertia analog of
 * Livewire's public/bindable properties. Declared here (rather than in `mode/`)
 * to keep `InputBaseProps` free of an import cycle. Resolved per input via
 * {@link useFieldMode}: explicit prop → `<Form>`/`<FormProvider>` context → `"edit"`.
 */
export type FieldMode = "edit" | "view";

export interface InputBaseProps {
  size?: Size;
  dirty?: boolean;
  error?: string;
  label?: string;
  /**
   * Keep the label for assistive tech, but do not draw it.
   *
   * For a control whose options already say what it does — a filter toolbar's
   * segmented switches, say — where a visible label is noise but an unnamed
   * control is a bug. Without this the only choices were an unnamed control or
   * a label the design does not have, and the silent one is the one that ships.
   */
  labelHidden?: boolean;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  /** `"edit"` (default) renders the control; `"view"` renders the value as text. Overrides the `<Form mode>` context. */
  mode?: FieldMode;
}

export type AffixPosition = "inside" | "outside";

export interface InputAffixProps {
  prefix?: ReactNode;
  suffix?: ReactNode;
  prefixPosition?: AffixPosition;
  suffixPosition?: AffixPosition;
}

import type { ReactNode } from "react";
import type { Size } from "../../utils/types";

export type InputOption<V = string> =
  | string
  | { value: V; label: string; disabled?: boolean; description?: string };

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

import type { SelectHTMLAttributes } from "react";
import type { InputBaseProps, InputOption, InputOptionGroup, InputAffixProps } from "../inputs.types";

export interface SelectProps
  extends InputBaseProps,
    InputAffixProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "prefix" | "multiple"> {
  /** Options list — strings or objects with value/label */
  list: InputOption[] | InputOptionGroup[];
  placeholder?: string;
  /** Callback for single-select value changes */
  onValueChange?: (value: string) => void;

  /** Layout variant. "native" uses <select>, "listbox" uses a custom dropdown. Default: "native" */
  variant?: "native" | "listbox";
  /** Enable multi-select (listbox variant only) */
  multiple?: boolean;
  /** Controlled multi-select value */
  values?: string[];
  /** Default multi-select value (uncontrolled) */
  defaultValues?: string[];
  /** Callback for multi-select value changes */
  onValuesChange?: (values: string[]) => void;
  /** Enable search/filter within the dropdown (listbox variant only) */
  searchable?: boolean;
  /** Suffix for the selected count display. Default: "selected" */
  selectedSuffix?: string;
  /** Selection indicator style. Default: "check" */
  indicator?: "check" | "checkbox";
}

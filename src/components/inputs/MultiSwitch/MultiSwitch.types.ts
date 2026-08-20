import type { HTMLAttributes } from "react";
import type { InputBaseProps, InputOption } from "../inputs.types";

/**
 * The container's DOM attributes are part of the API because the component
 * already spreads its rest props onto that container — `style`, `data-*` and
 * `aria-*` all worked at runtime while the type refused them, so a caller got a
 * compiler error for something the component does correctly.
 *
 * `onChange` is omitted because this control reports through `onValueChange`,
 * and admitting both would offer a handler that never fires.
 */
export interface MultiSwitchProps<V = string>
  extends InputBaseProps,
    Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  list: InputOption<V>[];
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  linear?: boolean;
}

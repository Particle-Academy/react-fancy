import type { HTMLAttributes } from "react";
import type { Color } from "../../../utils/types";
import type { InputBaseProps, InputOption } from "../inputs.types";

/**
 * An option, optionally with its own `color`: while it is selected the thumb
 * and the container border take that colour (a green "Assign" against a red
 * "Unassign"). An option without one keeps the default blue thumb.
 */
export type MultiSwitchOption<V = string> =
  | InputOption<V>
  | { value: V; label: string; disabled?: boolean; description?: string; color?: Color };

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
  list: MultiSwitchOption<V>[];
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  linear?: boolean;
}

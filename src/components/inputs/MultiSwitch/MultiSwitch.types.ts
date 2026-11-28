import type { HTMLAttributes } from "react";
import type { Color } from "../../../utils/types";
import type { InputBaseProps, InputOption } from "../inputs.types";

/**
 * `data-*` attributes for one option's `role="radio"` button: a stable handle
 * an agent or a test can address that option by. Only `data-*` keys are
 * rendered; role, aria and handlers stay the component's.
 */
export type MultiSwitchOptionAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

/**
 * An option, optionally with its own `color`: while it is selected the thumb
 * and the container border take that colour (a green "Assign" against a red
 * "Unassign"). An option without one uses the kit accent (`--fancy-accent`),
 * which falls back to the blue thumb it always had.
 *
 * `attributes` puts `data-*` on that option's button. Every option button also
 * carries `data-react-fancy-multi-switch-option` and, for a string, number or
 * boolean value, `data-value`.
 */
export type MultiSwitchOption<V = string> =
  | InputOption<V>
  | {
      value: V;
      label: string;
      disabled?: boolean;
      description?: string;
      color?: Color;
      attributes?: MultiSwitchOptionAttributes;
    };

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

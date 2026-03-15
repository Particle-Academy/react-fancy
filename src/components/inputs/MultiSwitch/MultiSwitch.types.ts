import type { InputBaseProps, InputOption } from "../inputs.types";

export interface MultiSwitchProps<V = string> extends InputBaseProps {
  list: InputOption<V>[];
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  linear?: boolean;
}

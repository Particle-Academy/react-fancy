import type { InputBaseProps, InputOption } from "../inputs.types";

export interface RadioGroupProps<V = string>
  extends Omit<InputBaseProps, "id"> {
  list: InputOption<V>[];
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  orientation?: "horizontal" | "vertical";
}

import type { InputBaseProps, InputOption } from "../inputs.types";

export interface CheckboxGroupProps<V = string>
  extends Omit<InputBaseProps, "id"> {
  list: InputOption<V>[];
  value?: V[];
  defaultValue?: V[];
  onValueChange?: (values: V[]) => void;
  orientation?: "horizontal" | "vertical";
}

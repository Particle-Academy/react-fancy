import type { Size } from "../../utils/types";

export type InputOption<V = string> =
  | string
  | { value: V; label: string; disabled?: boolean; description?: string };

export type InputOptionGroup<V = string> = {
  label: string;
  options: InputOption<V>[];
};

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
}

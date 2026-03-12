import type { InputBaseProps } from "../inputs.types";

interface SliderBaseProps extends InputBaseProps {
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
  marks?: { value: number; label?: string }[];
}

export interface SliderSingleProps extends SliderBaseProps {
  range?: false;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
}

export interface SliderRangeProps extends SliderBaseProps {
  range: true;
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
}

export type SliderProps = SliderSingleProps | SliderRangeProps;

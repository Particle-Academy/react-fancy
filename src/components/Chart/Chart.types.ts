export interface ChartBarData {
  label: string;
  value: number;
  color?: string;
}

export interface ChartBarProps {
  data: ChartBarData[];
  height?: number;
  showValues?: boolean;
  className?: string;
}

export interface ChartDonutData {
  label: string;
  value: number;
  color?: string;
}

export interface ChartDonutProps {
  data: ChartDonutData[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
  className?: string;
}

export interface ChartSeries {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartCommonProps {
  className?: string;
  height?: number;
  xAxis?: boolean | { label?: string; tickCount?: number };
  yAxis?: boolean | { label?: string; tickCount?: number };
  grid?: boolean | { horizontal?: boolean; vertical?: boolean };
  tooltip?: boolean;
  animate?: boolean;
  responsive?: boolean;
}

export interface ChartLineProps extends ChartCommonProps {
  labels: string[];
  series: ChartSeries[];
  curve?: "linear" | "monotone";
  showDots?: boolean;
  fill?: boolean;
  fillOpacity?: number;
}

export type ChartAreaProps = Omit<ChartLineProps, "fill">;

export interface ChartPieData {
  label: string;
  value: number;
  color?: string;
}

export interface ChartPieProps {
  data: ChartPieData[];
  size?: number;
  showLabels?: boolean;
  tooltip?: boolean;
  className?: string;
}

export interface ChartSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export interface ChartHorizontalBarProps {
  data: ChartBarData[];
  height?: number;
  showValues?: boolean;
  className?: string;
}

export interface ChartStackedBarProps extends ChartCommonProps {
  labels: string[];
  series: ChartSeries[];
}

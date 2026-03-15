export interface SkeletonProps {
  /** Shape of the skeleton placeholder */
  shape?: "rect" | "circle" | "text";
  /** Custom width (CSS value or number in px) */
  width?: string | number;
  /** Custom height (CSS value or number in px) */
  height?: string | number;
  /** Additional CSS classes */
  className?: string;
}

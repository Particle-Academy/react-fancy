import type { HTMLAttributes } from "react";
import type { LiveStatus } from "../../utils/media-channel";

export interface LiveBadgeLabels {
  live: string;
  starting: string;
  offline: string;
  ended: string;
}

export interface LiveBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Default `"live"`. */
  status?: LiveStatus;
  /** Show the dot (on air). Default: on while `status` is `"live"`. */
  dot?: boolean;
  size?: "sm" | "md" | "lg";
  /** Every visible string. English defaults. */
  labels?: Partial<LiveBadgeLabels>;
}

import { forwardRef } from "react";
import { Badge } from "../Badge/Badge";
import type { Color } from "../../utils/types";
import type { LiveStatus } from "../../utils/media-channel";
import type { LiveBadgeLabels, LiveBadgeProps } from "./LiveBadge.types";

const DEFAULT_LABELS: LiveBadgeLabels = {
  live: "LIVE",
  starting: "Starting",
  offline: "Offline",
  ended: "Ended",
};

const COLORS: Record<LiveStatus, Color> = {
  live: "red",
  starting: "amber",
  offline: "zinc",
  ended: "zinc",
};

/** A live channel's status: LIVE, Starting, Offline or Ended. The status itself is the host's to supply. */
export const LiveBadge = forwardRef<HTMLSpanElement, LiveBadgeProps>(function LiveBadge(
  { status = "live", dot, size = "sm", labels: labelsProp, ...rest },
  ref,
) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  return (
    <Badge
      ref={ref}
      data-react-fancy-live-badge=""
      data-live-status={status}
      color={COLORS[status]}
      size={size}
      dot={dot ?? status === "live"}
      {...rest}
    >
      {labels[status]}
    </Badge>
  );
});

LiveBadge.displayName = "LiveBadge";

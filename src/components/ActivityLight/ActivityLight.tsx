import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { ActivityLightProps, ActivityLevel } from "./ActivityLight.types";

/**
 * Activity on an **edge** — a relationship between two parties — with a recency
 * ramp and an optional volume.
 *
 * Not a presence dot. `Avatar status` belongs to one party and says whether
 * *they* are online; this belongs to a pair and says when *the link between
 * them* last moved. Use it in a comms column, a collaborator lane, anywhere the
 * subject is the relationship rather than the participant.
 *
 * ## Two kinds of nothing, and they must not look alike
 *
 * - **`level: null`** — the edge is real, its recency is not observable. Renders
 *   NOTHING: no dot, no dash, no placeholder. A grey dot would assert "quiet",
 *   which is a claim we cannot make.
 * - **`count: null`** or omitted — the edge's recency is known but its volume is
 *   not. Renders the light with no number.
 * - **`count: 0`** — measured, and none. Renders `0`, because that is a fact.
 *   Suppressing it would be indistinguishable from not having looked.
 *
 * The distinction reads as pedantic until a count is wrong in the direction
 * that flatters: a `0` where the truth is "unknown" tells the reader an agent
 * works alone, and they believe it.
 *
 * @example
 * ```tsx
 * <ActivityLight level="live" direction="both" count={12} label="Genie and Tynn" />
 * <ActivityLight level="quiet" count={0} label="Genie and Weaver" />
 * <ActivityLight level={null} label="Genie and an unknown peer" />
 * ```
 */
export const ActivityLight = forwardRef<HTMLSpanElement, ActivityLightProps>(
  ({ level, direction, count = null, label, className, ...props }, ref) => {
    // The one early return in the component, and the most important line in it.
    if (level === null) return null;

    const counted = typeof count === "number" && Number.isFinite(count);

    return (
      <span
        ref={ref}
        data-react-fancy-activity-light={level}
        {...(direction ? { "data-react-fancy-activity-light-direction": direction } : {})}
        aria-label={counted ? `${label}: ${level}, ${count}` : `${label}: ${level}`}
        role="img"
        className={cn(
          "inline-flex items-center gap-1 align-middle",
          LEVEL_CLASS[level],
          className,
        )}
        {...props}
      >
        <span
          data-react-fancy-activity-light-dot=""
          aria-hidden="true"
          className={cn("size-2 shrink-0 rounded-full bg-current", level === "live" && "animate-pulse")}
        />

        {direction && (
          <span
            data-react-fancy-activity-light-arrow=""
            aria-hidden="true"
            className="font-mono text-[0.625rem] leading-none"
          >
            {DIRECTION_GLYPH[direction]}
          </span>
        )}

        {/* `counted` is the gate, NOT `count` — `0` is falsy and would vanish. */}
        {counted && (
          <span
            data-react-fancy-activity-light-count=""
            className="font-mono text-xs tabular-nums leading-none"
          >
            {count}
          </span>
        )}
      </span>
    );
  },
);

ActivityLight.displayName = "ActivityLight";

/**
 * The ramp. Each level is visually distinct from every other — a test asserts
 * that, because two levels that look alike make the ramp a lie.
 */
const LEVEL_CLASS: Record<ActivityLevel, string> = {
  live: "text-emerald-500 dark:text-emerald-400",
  recent: "text-sky-500 dark:text-sky-400",
  quiet: "text-zinc-400 dark:text-zinc-500",
  unseen: "text-amber-500 dark:text-amber-400",
};

const DIRECTION_GLYPH: Record<"in" | "out" | "both", string> = {
  in: "←",
  out: "→",
  both: "⇄",
};

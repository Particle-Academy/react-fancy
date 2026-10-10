import type { HTMLAttributes } from "react";

/**
 * How recently an edge carried traffic.
 *
 * `null` is not a level — it means the edge is real but **undatable**, and it
 * renders nothing at all. A grey dot would be the claim "this edge is quiet",
 * which is a different statement from "we cannot see when it last moved".
 */
export type ActivityLevel = "live" | "recent" | "quiet" | "unseen";

/** Which way the traffic went. Absent means undirected, not "both". */
export type ActivityDirection = "in" | "out" | "both";

export interface ActivityLightProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * The recency of this edge, or `null` for a real edge whose recency cannot be
   * observed — which renders NOTHING.
   */
  level: ActivityLevel | null;
  /** Which way the traffic went. Omit when it is not known or not meaningful. */
  direction?: ActivityDirection;
  /**
   * How much traffic. `null` (or omitted) means **not counted** and renders no
   * number — never a `0`, because a zero claims the other party worked alone.
   * A measured `0` IS rendered: "we looked and it was none" is a fact.
   */
  count?: number | null;
  /** Accessible name for the edge — "Genie and Tynn". Required. */
  label: string;
}

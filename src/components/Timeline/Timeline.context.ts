import { createContext, useContext } from "react";
import type { TimelineVariant } from "./Timeline.types";

interface TimelineContextValue {
  variant: TimelineVariant;
  index: number;
  total: number;
  animated: boolean;
}

export const TimelineContext = createContext<TimelineContextValue>({
  variant: "stacked",
  index: 0,
  total: 0,
  animated: true,
});

export function useTimeline() {
  return useContext(TimelineContext);
}

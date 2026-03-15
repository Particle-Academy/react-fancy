import { createContext, useContext } from "react";
import type { TimelineOrientation } from "./Timeline.types";

interface TimelineContextValue {
  orientation: TimelineOrientation;
  index: number;
}

export const TimelineContext = createContext<TimelineContextValue>({
  orientation: "vertical",
  index: 0,
});

export function useTimeline() {
  return useContext(TimelineContext);
}

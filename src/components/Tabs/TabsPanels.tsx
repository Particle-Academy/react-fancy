import { cn } from "../../utils/cn";
import type { TabsPanelsProps } from "./Tabs.types";

export function TabsPanels({ children, className }: TabsPanelsProps) {
  return <div data-react-fancy-tabs-panels="" className={cn("mt-4", className)}>{children}</div>;
}

TabsPanels.displayName = "TabsPanels";

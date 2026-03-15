import { cn } from "../../utils/cn";
import { useTabs } from "./Tabs.context";
import type { TabsPanelProps } from "./Tabs.types";

export function TabsPanel({ children, value, className }: TabsPanelProps) {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return (
    <div data-react-fancy-tabs-panel="" role="tabpanel" className={cn("fancy-fade-in", className)}>
      {children}
    </div>
  );
}

TabsPanel.displayName = "TabsPanel";

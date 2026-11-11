import { cn } from "../../utils/cn";
import { useTabs } from "./Tabs.context";
import type { TabsPanelProps } from "./Tabs.types";

export function TabsPanel({ children, value, className, keepMounted }: TabsPanelProps) {
  const { activeTab, keepMounted: keepAll } = useTabs();
  const isActive = activeTab === value;

  // An inactive panel unmounts unless kept: then it stays in the markup (and the
  // server-rendered HTML) with `hidden`, which removes it from layout, focus
  // order and the accessibility tree, as the WAI-ARIA tabs pattern expects.
  if (!isActive && !(keepMounted ?? keepAll)) return null;

  return (
    <div
      data-react-fancy-tabs-panel=""
      data-state={isActive ? "active" : "inactive"}
      role="tabpanel"
      hidden={!isActive}
      className={cn(isActive && "fancy-fade-in", className)}
    >
      {children}
    </div>
  );
}

TabsPanel.displayName = "TabsPanel";

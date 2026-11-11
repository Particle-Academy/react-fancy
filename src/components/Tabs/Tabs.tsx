import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { TabsContext } from "./Tabs.context";
import { TabsList } from "./TabsList";
import { TabsTab } from "./TabsTab";
import { TabsPanels } from "./TabsPanels";
import { TabsPanel } from "./TabsPanel";
import type { TabsProps } from "./Tabs.types";

function TabsRoot({
  children,
  defaultTab = "",
  activeTab: controlledTab,
  onTabChange,
  variant = "underline",
  keepMounted = false,
  className,
}: TabsProps) {
  const [activeTab, setActiveTab] = useControllableState(
    controlledTab,
    defaultTab,
    onTabChange,
  );

  const ctx = useMemo(
    () => ({ activeTab, setActiveTab, variant, keepMounted }),
    [activeTab, setActiveTab, variant, keepMounted],
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div data-react-fancy-tabs="" className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panels: TabsPanels,
  Panel: TabsPanel,
});

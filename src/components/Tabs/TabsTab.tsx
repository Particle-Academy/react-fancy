import { cn } from "../../utils/cn";
import { useTabs } from "./Tabs.context";
import type { TabsTabProps } from "./Tabs.types";

export function TabsTab({
  children,
  value,
  disabled = false,
  className,
}: TabsTabProps) {
  const { activeTab, setActiveTab, variant } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      data-react-fancy-tabs-tab=""
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => !disabled && setActiveTab(value)}
      className={cn(
        "text-sm font-medium transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        variant === "underline" && [
          "border-b-2 px-4 py-2.5",
          isActive
            ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
            : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
        ],
        variant === "pills" && [
          "rounded-md px-4 py-1.5",
          isActive
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
            : "text-zinc-500 dark:text-zinc-400",
        ],
        variant === "boxed" && [
          "flex-1 rounded-md px-4 py-1.5",
          isActive
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
            : "text-zinc-500 dark:text-zinc-400",
        ],
        className,
      )}
    >
      {children}
    </button>
  );
}

TabsTab.displayName = "TabsTab";

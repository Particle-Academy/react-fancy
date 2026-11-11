import type { ButtonHTMLAttributes, ReactNode } from "react";

export type TabsVariant = "underline" | "pills" | "boxed";

export interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  variant: TabsVariant;
  keepMounted: boolean;
}

export interface TabsProps {
  children: ReactNode;
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  variant?: TabsVariant;
  /**
   * Keep inactive panels mounted, `hidden`, instead of unmounting them. Their
   * content is then in the server-rendered HTML (crawlers, "facts on the first
   * byte") and their state survives a tab switch. Default `false`: a panel can
   * hold a heavy or size-dependent surface (a chart, a map) that should not
   * mount while it is invisible. A `Tabs.Panel` can override it.
   */
  keepMounted?: boolean;
  className?: string;
}

export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export interface TabsTabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export interface TabsPanelsProps {
  children: ReactNode;
  className?: string;
}

export interface TabsPanelProps {
  children: ReactNode;
  value: string;
  /** Overrides `Tabs`' `keepMounted` for this panel. */
  keepMounted?: boolean;
  className?: string;
}

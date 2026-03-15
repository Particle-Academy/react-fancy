import type { ReactNode } from "react";

export type TabsVariant = "underline" | "pills" | "boxed";

export interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  variant: TabsVariant;
}

export interface TabsProps {
  children: ReactNode;
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  variant?: TabsVariant;
  className?: string;
}

export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export interface TabsTabProps {
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
  className?: string;
}

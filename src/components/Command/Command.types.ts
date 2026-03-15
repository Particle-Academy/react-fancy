import type { ReactNode } from "react";

export interface CommandContextValue {
  open: boolean;
  close: () => void;
  query: string;
  setQuery: (query: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

export interface CommandProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  className?: string;
}

export interface CommandInputProps {
  placeholder?: string;
  className?: string;
}

export interface CommandListProps {
  children: ReactNode;
  className?: string;
}

export interface CommandItemProps {
  children: ReactNode;
  value?: string;
  onSelect?: () => void;
  className?: string;
}

export interface CommandGroupProps {
  children: ReactNode;
  heading?: string;
  className?: string;
}

export interface CommandEmptyProps {
  children?: ReactNode;
  className?: string;
}

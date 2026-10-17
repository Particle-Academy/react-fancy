import type { ReactNode } from "react";

export interface CommandContextValue {
  open: boolean;
  close: () => void;
  query: string;
  setQuery: (query: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  shouldFilter: boolean;
}

export interface CommandProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  className?: string;
  /**
   * `false` turns off the built-in filter: every `Command.Item` renders, and the
   * caller decides which to render — for a palette with its own matching, such as
   * type-ahead prefixes (`w> tynn`). Input, active index and keyboard handling are
   * unchanged. Default `true`. Same name as cmdk's.
   */
  shouldFilter?: boolean;
  /** The search text, if you want to own it — which filtering yourself needs. */
  query?: string;
  onQueryChange?: (query: string) => void;
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

import type { ReactNode } from "react";
import type { RenderExtension } from "../ContentRenderer/extensions";

export interface EditorAction {
  icon: ReactNode;
  label: string;
  command: string;
  commandArg?: string;
  active?: boolean;
}

export interface EditorToolbarProps {
  actions?: EditorAction[];
  onAction?: (command: string) => void;
  children?: ReactNode;
  className?: string;
}

export interface EditorContentProps {
  className?: string;
}

export interface EditorProps {
  children: ReactNode;
  className?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  outputFormat?: "html" | "markdown";
  lineSpacing?: number;
  placeholder?: string;
  /** Per-instance render extensions. Merged with any globally-registered extensions. */
  extensions?: RenderExtension[];
}

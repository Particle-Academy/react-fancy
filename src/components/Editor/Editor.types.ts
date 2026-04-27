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
  /** Max height in px before scrolling. When set, content area becomes scrollable. */
  maxHeight?: number;
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
  /**
   * Skip HTML sanitization of the initial value. By default the initial markdown/HTML
   * is sanitized to remove `<script>`, `<iframe>`, event handlers, and `javascript:`
   * URIs before being placed into contentEditable. Pass `unsafe` only when the
   * initial value is fully trusted.
   * @default false
   */
  unsafe?: boolean;
}

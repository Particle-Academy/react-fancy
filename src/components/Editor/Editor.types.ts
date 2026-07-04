import type { ReactNode } from "react";
import type { RenderExtension } from "../ContentRenderer/extensions";
import type { FieldMode } from "../inputs/inputs.types";

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
  /**
   * The format of the INCOMING `value` / `defaultValue`. Default `"auto"`
   * keeps the historical sniff (`detectFormat`) — but real-world markdown that
   * merely mentions HTML-ish snippets (`<code>`, `<table`, …) flips the sniff
   * to html and renders as a wall of text. Callers with a KNOWN format
   * (file-typed content, values previously emitted with
   * `outputFormat="markdown"`) should declare it; explicit values bypass the
   * sniff entirely — in edit mode AND view mode.
   * @default "auto"
   */
  valueFormat?: "markdown" | "html" | "auto";
  lineSpacing?: number;
  placeholder?: string;
  /**
   * View/edit mode — like the react-fancy inputs. Resolution: this prop →
   * nearest `<Form>` / `<FormProvider>` context → `"edit"`. In `"view"` mode the
   * editor renders its value read-only through `<ContentRenderer>` (matching
   * `outputFormat` — markdown/html) instead of the editable toolbar + content.
   * @default "edit"
   */
  mode?: FieldMode;
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

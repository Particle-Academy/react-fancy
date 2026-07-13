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
  /**
   * Append a "Source" toggle (reveals the raw HTML/Markdown behind the editor)
   * to the right of the default toolbar. Ignored when `children` are supplied —
   * custom toolbars compose their own `<Editor.SourceToggle />`.
   * @default true
   */
  showSourceToggle?: boolean;
}

export interface EditorContentProps {
  className?: string;
  /** Max height in px before scrolling. When set, content area becomes scrollable. */
  maxHeight?: number;
  /** Class names applied to the raw-source `<textarea>` shown while source mode is on. */
  sourceClassName?: string;
}

export interface EditorSourceToggleProps {
  className?: string;
  /** Toggle glyph/label. @default `</>` */
  icon?: ReactNode;
  /** Accessible title when in rich-text mode (click → source). @default "Source" */
  title?: string;
  /** Accessible title when in source mode (click → rich text). @default "Rich text" */
  activeTitle?: string;
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
   * Controlled source-view flag. When `true` the content area shows the raw
   * HTML/Markdown (`value`, in `outputFormat`) in an editable `<textarea>`
   * instead of the rich-text surface. Pair with `onShowSourceChange`, or leave
   * uncontrolled and drive it with the toolbar's Source toggle.
   */
  showSource?: boolean;
  /** Initial source-view flag when uncontrolled. @default false */
  defaultShowSource?: boolean;
  /** Fired when the Source toggle (or an agent) flips source view on/off. */
  onShowSourceChange?: (showSource: boolean) => void;
  /**
   * Skip HTML sanitization of the initial value. By default the initial markdown/HTML
   * is sanitized to remove `<script>`, `<iframe>`, event handlers, and `javascript:`
   * URIs before being placed into contentEditable. Pass `unsafe` only when the
   * initial value is fully trusted.
   * @default false
   */
  unsafe?: boolean;
}

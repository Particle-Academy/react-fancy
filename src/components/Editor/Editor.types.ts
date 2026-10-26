import type { ReactNode } from "react";
import type { RenderExtension } from "../ContentRenderer/extensions";
import type { FieldMode } from "../inputs/inputs.types";
import type { FullScreenMode } from "../../hooks/use-full-screen";

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
  /**
   * Append a full-screen toggle (Lucide `maximize-2` / `minimize-2`) at the
   * right end of the default toolbar. Ignored when `children` are supplied —
   * custom toolbars compose `<Editor.FullScreenToggle />` themselves.
   * @default false
   */
  showFullScreenToggle?: boolean;
  /**
   * Host content rendered INSIDE the default toolbar, at its trailing end:
   * after the Source toggle and before the full-screen toggle, which keeps the
   * trailing edge. Use it for a host's own Save / Cancel, which then stays
   * reachable while the editor is full screen. Wrapped in
   * `[data-react-fancy-editor-toolbar-extra]`. Same name and placement as
   * fancy-sheets' `SheetWorkbook toolbarExtra`. Ignored when `children` are
   * supplied — a custom toolbar places host content itself.
   */
  toolbarExtra?: ReactNode;
}

export interface EditorFullScreenToggleProps {
  className?: string;
  /** Lucide name shown while NOT full screen. @default "maximize-2" */
  enterIcon?: string;
  /** Lucide name shown while full screen. @default "minimize-2" */
  exitIcon?: string;
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
   * Controlled full-screen flag. While `true` the editor covers the viewport,
   * the toolbar stays at the top and the content fills the rest (a
   * `<Editor.Content maxHeight>` cap is ignored). Escape, the toolbar toggle or
   * the browser's own UI request `false` through `onFullScreenChange`.
   */
  fullScreen?: boolean;
  /** Initial full-screen flag when uncontrolled. @default false */
  defaultFullScreen?: boolean;
  /** Fired when the toggle, Escape, an agent or the browser changes full screen. */
  onFullScreenChange?: (fullScreen: boolean) => void;
  /**
   * `"overlay"` covers the viewport in place and always works, including in
   * iframes and dialogs. `"native"` uses the browser Fullscreen API and falls
   * back to the overlay when the browser refuses.
   * @default "overlay"
   */
  fullScreenMode?: FullScreenMode;
  /**
   * Skip HTML sanitization of the initial value. By default the initial markdown/HTML
   * is sanitized to remove `<script>`, `<iframe>`, event handlers, and `javascript:`
   * URIs before being placed into contentEditable. Pass `unsafe` only when the
   * initial value is fully trusted.
   * @default false
   */
  unsafe?: boolean;
}

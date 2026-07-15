export interface CodeViewProps {
  /** Source text to display / edit. Controlled. */
  value: string;
  /**
   * Called on edit. Omit (or set `readOnly`) for a read-only view. When
   * provided, the view is an editable source surface (transparent textarea over
   * the highlight overlay).
   */
  onChange?: (value: string) => void;
  /**
   * Language id for syntax highlighting. Only `"html"` is highlighted (the one
   * grammar shipped by `fancy-file-commons`); everything else — including
   * `"markdown"` and `"plaintext"` — renders un-highlighted. For richer language
   * highlighting use `@particle-academy/fancy-code`'s `CodeEditor`.
   * @default "plaintext"
   */
  language?: "html" | "markdown" | "plaintext" | (string & {});
  /** Read-only mode (no editing even if `onChange` is passed). @default false */
  readOnly?: boolean;
  /** Placeholder shown when empty. */
  placeholder?: string;
  /** Min height in px before the view grows with content. @default 120 */
  minHeight?: number;
  /** Max height in px before the view scrolls internally. */
  maxHeight?: number;
  /** Additional classes on the scroll container (e.g. `h-full`, `flex-auto`). */
  className?: string;
}

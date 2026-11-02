import type { CodeLanguage } from "../CodeBlock/CodeBlock.types";

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
   * Language id or alias for syntax highlighting, case-insensitive — the same
   * set as `CodeBlock`: TypeScript, JavaScript, JSON, PHP, Python, Go,
   * Markdown, shell, dotenv and HTML/XML, via `fancy-file-commons`'
   * `tokenize`. Anything else, including `"plaintext"`, renders un-highlighted.
   * For a full editor use `@particle-academy/fancy-code`'s `CodeEditor`.
   * @default "plaintext"
   */
  language?: CodeLanguage;
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

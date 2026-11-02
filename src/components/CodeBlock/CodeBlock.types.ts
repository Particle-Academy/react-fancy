import type { HTMLAttributes, ReactNode } from "react";

/** Words on the copy button, for translation. */
export interface CodeBlockCopyLabels {
  /** Idle label (aria-label and tooltip). @default "Copy code" */
  copy?: string;
  /** Shown, visibly and to screen readers, after a successful copy. @default "Copied" */
  copied?: string;
  /** Shown after a copy that could not be written. @default "Copy failed" */
  failed?: string;
}

/** Reported through `onCopyCode` after every copy attempt. */
export interface CodeBlockCopyEvent {
  /** Exactly the `code` prop: the raw source, never the highlighted HTML. */
  text: string;
  /** Whether the clipboard accepted it. */
  ok: boolean;
}

export interface CodeBlockProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** The source to show. Rendered as text; never parsed as HTML. */
  code: string;
  /**
   * Language id. Only `"html"` (and its aliases `"htm"`, `"xml"`, `"xhtml"`)
   * is highlighted today: it is the one grammar `fancy-file-commons` ships.
   * Every other value, known or not, renders as plain text. Reflected as
   * `data-language` either way.
   * @default "plaintext"
   */
  language?: "html" | "xml" | "plaintext" | (string & {});
  /** Show a copy button. It copies `code` exactly. @default true */
  copyable?: boolean;
  /** Header above the code: a filename, or a short label like "Terminal". */
  title?: ReactNode;
  /** Number each line in a gutter that is not part of the code text. @default false */
  showLineNumbers?: boolean;
  /** Wrap long lines instead of scrolling horizontally. @default false */
  wrap?: boolean;
  /** Words on the copy button. */
  copyLabels?: CodeBlockCopyLabels;
  /** Called after every copy attempt, successful or not. */
  onCopyCode?: (event: CodeBlockCopyEvent) => void;
  /** Additional classes on the root element. */
  className?: string;
}

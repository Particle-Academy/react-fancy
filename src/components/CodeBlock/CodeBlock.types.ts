import type { HTMLAttributes, ReactNode } from "react";

/**
 * Language ids `CodeBlock` and `CodeView` highlight (aliases included). Any
 * other string is accepted and renders as plain text.
 */
export type CodeLanguage =
  | "typescript" | "ts" | "tsx"
  | "javascript" | "js" | "jsx"
  | "json"
  | "php"
  | "python" | "py"
  | "go"
  | "markdown" | "md"
  | "shell" | "sh" | "bash" | "zsh"
  | "dotenv" | "env"
  | "html" | "htm" | "xml" | "xhtml"
  | "plaintext"
  | (string & {});

/** Words on the copy button, for translation. */
export interface CodeBlockCopyLabels {
  /** Idle label (aria-label and tooltip). @default "Copy code" */
  copy?: string;
  /** Shown, visibly and to screen readers, after a successful copy. @default "Copied" */
  copied?: string;
  /** Shown after a copy that could not be written. @default "Copy failed" */
  failed?: string;
}

/** Other words CodeBlock speaks, for translation. */
export interface CodeBlockLabels {
  /**
   * Accessible name of the scrollable code region (the `<pre>`, which is
   * focusable so a keyboard user can scroll it).
   * @default the `title` when it is a string, otherwise "Code"
   */
  region?: string;
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
   * Language id or alias, case-insensitive. Highlighted: TypeScript (`ts`,
   * `tsx`), JavaScript (`js`, `jsx`), JSON (`json`), PHP (`php`), Python
   * (`py`), Go (`go`), Markdown (`md`), shell (`sh`, `bash`, `zsh`, `shell`),
   * dotenv (`env`, `dotenv`) and HTML (`html`, `htm`, `xml`, `xhtml`), via
   * `fancy-file-commons`' `tokenize`. Any other value renders as plain text.
   * Reflected as `data-language` either way.
   * @default "plaintext"
   */
  language?: CodeLanguage;
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
  /** Other words, such as the code region's accessible name. */
  labels?: CodeBlockLabels;
  /** Called after every copy attempt, successful or not. */
  onCopyCode?: (event: CodeBlockCopyEvent) => void;
  /** Additional classes on the root element. */
  className?: string;
}

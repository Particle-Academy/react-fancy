import type { RenderExtension } from "./extensions";

/** What a copy button copies. */
export type ContentCopyKind = "code" | "table";

/** What is handed to a clipboard writer. */
export interface ContentClipboardPayload {
  kind: ContentCopyKind;
  /**
   * Plain text. For code: exactly the code between the fences, with no
   * language label and no added trailing newline. For a table: TSV (tab
   * between cells, newline between rows, no trailing newline).
   */
  text: string;
  /** The block's sanitised HTML (`<pre>…</pre>` or `<table>…</table>`), for rich paste. */
  html: string;
}

/**
 * Writes one copy to the clipboard. Throwing, rejecting, or returning `false`
 * means the copy failed; the failure is announced, never swallowed.
 */
export type ContentClipboardWriter = (
  payload: ContentClipboardPayload,
) => void | boolean | Promise<void | boolean>;

/** Reported through `onCopy` after every copy attempt. */
export interface ContentCopyEvent extends ContentClipboardPayload {
  /** Position of the button among this renderer's copy buttons, in document order. */
  index: number;
  /** Whether the clipboard write succeeded. */
  ok: boolean;
}

export interface ContentRendererProps {
  value: string;
  format?: "html" | "markdown" | "auto";
  lineSpacing?: number;
  className?: string;
  /** Per-instance render extensions. Merged with any globally-registered extensions. */
  extensions?: RenderExtension[];
  /**
   * Skip HTML sanitization. By default, rendered output is sanitized to remove
   * `<script>`, `<iframe>`, event handlers, and `javascript:` URIs. Pass
   * `unsafe` only when the input is fully trusted (e.g. server-rendered
   * markdown from your own CMS).
   * @default false
   */
  unsafe?: boolean;
  /**
   * Copy buttons on code blocks and tables. `false` turns them all off; an
   * object turns kinds off individually (`{ table: false }`).
   * @default true
   */
  copyButtons?: boolean | { code?: boolean; table?: boolean };
  /** Called after every copy attempt, successful or not. */
  onCopy?: (event: ContentCopyEvent) => void;
  /**
   * Host-supplied clipboard writer, for environments where
   * `navigator.clipboard` is unreliable (e.g. a sandboxed Electron window:
   * pass one that calls Electron's `clipboard`). The default writes
   * text/html + text/plain via `ClipboardItem`, falling back to `writeText`.
   */
  clipboardWriter?: ContentClipboardWriter;
  /**
   * The value is still arriving. Holds back an unfinished trailing custom tag
   * (of a registered extension) or code fence, so a partial `<result` or
   * half a code block never flashes as raw text. Set it back to `false` when
   * the stream ends and everything renders.
   * @default false
   */
  streaming?: boolean;
}

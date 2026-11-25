import type { ComponentType } from "react";
import type { RenderExtension } from "./extensions";

/** What a fence renderer receives for one lifted code fence. */
export interface ContentFenceProps {
  /**
   * The code between the fences, exactly as written: no trailing newline, the
   * opening fence's indentation removed. Untrusted: render it as text, or parse
   * it, never inject it as HTML.
   */
  code: string;
  /** The first word of the info string, lower-cased (`mermaid`). */
  language: string;
  /** The whole info string after the fence marker (`mermaid title="Flow"`). */
  info: string;
}

/** Renders one code fence of a given language in place of a code block. */
export type ContentFenceRenderer = ComponentType<ContentFenceProps>;

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
   * Per-language code-fence renderers, keyed by language (case-insensitive):
   * `fences={{ mermaid: MermaidFence }}` renders each ```mermaid block with that
   * component instead of a code block. Markdown only. Every language not listed
   * renders as a code block exactly as without this prop. While streaming, a
   * fence reaches its renderer only once it has closed.
   */
  fences?: Record<string, ContentFenceRenderer>;
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
   * The value is still arriving. Set it back to `false` when the stream ends
   * and everything renders.
   *
   * - `true` holds back an unfinished trailing custom tag (of a registered
   *   extension) or code fence until it closes, so a partial `<result` or half
   *   a code block never flashes as raw text.
   * - `"progressive"` shows an open block as it fills: an open registered tag
   *   whose opening tag is complete renders its component with the body so
   *   far, and an open code fence renders as a code block of what has arrived
   *   (with no copy button until it closes). A partial opening tag
   *   (`<result title="Do`) is still held back.
   * @default false
   */
  streaming?: boolean | "progressive";
  /**
   * The host's own streaming hold-back, for an inline grammar the renderer does
   * not know (pills such as `[file:a.ts|label]`). Called only while
   * `streaming`, with the text as it arrived; return the index to cut at, or
   * `null` to keep everything. The renderer cuts there FIRST, then applies its
   * own fence and tag hold-back to what remains, so nothing past either cut is
   * ever shown. A cut outside `0..length-1` is ignored.
   */
  holdBack?: (text: string) => number | null;
  /**
   * Rewrites the text before it renders (after `holdBack`): resolve pills,
   * strip forbidden tags, and so on. `ctx.streaming` says whether more is still
   * arriving. Output still goes through sanitisation unless `unsafe`.
   */
  transform?: (text: string, ctx: { streaming: boolean }) => string;
}

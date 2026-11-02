import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  highlightCode,
  tokenize,
  LIGHT_COLORS,
  DARK_COLORS,
  type ThemeColors,
  type Token,
} from "@particle-academy/fancy-file-commons";
import { cn } from "../../utils/cn";
import { visuallyHidden } from "../../utils/visually-hidden";
import { Button } from "../Button/Button";
import { defaultClipboardWriter, runWriter } from "../ContentRenderer/copy";
import { useIsDark } from "../CodeView/use-is-dark";
import type { CodeBlockProps } from "./CodeBlock.types";

/** How long "Copied" / "Copy failed" stays before the button resets. */
const FEEDBACK_MS = 2000;

/**
 * Tokens for any language fancy-file-commons can highlight (aliases included,
 * case-insensitive); none for anything else, which renders as plain text.
 * `tokenize` returns sorted, non-overlapping, in-bounds tokens, which
 * `highlightLines` relies on.
 */
function tokensFor(code: string, language: string): Token[] {
  return tokenize(code, language) ?? [];
}

/**
 * Highlight one line at a time, clipping each token to the line it falls on, so
 * a token that spans lines (an HTML comment) keeps its colour on every line.
 * `highlightCode` escapes every slice it emits, highlighted or not.
 */
function highlightLines(code: string, tokens: Token[], colors: ThemeColors): string[] {
  const out: string[] = [];
  let start = 0;
  let ti = 0;
  for (const line of code.split("\n")) {
    const end = start + line.length;
    while (ti < tokens.length && tokens[ti].end <= start) ti++;
    const clipped: Token[] = [];
    for (let j = ti; j < tokens.length && tokens[j].start < end; j++) {
      const s = Math.max(tokens[j].start, start) - start;
      const e = Math.min(tokens[j].end, end) - start;
      if (e > s) clipped.push({ type: tokens[j].type, start: s, end: e });
    }
    out.push(highlightCode(line, clipped, colors));
    start = end + 1;
  }
  return out;
}

type CopyState = "idle" | "copied" | "failed";

// Matches CodeView's text metrics so the two sit together.
const TEXT_METRICS = "m-0 p-3 font-mono text-xs leading-relaxed";

/**
 * A display-only code block: `<pre><code>`, syntax-highlighted where a grammar
 * exists, with an optional copy button. It contains no textarea, input, select
 * or contenteditable element, so it is safe on pages that must not accept
 * input. For an editable or selectable source surface, use `CodeView`.
 */
export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    code,
    language = "plaintext",
    copyable = true,
    title,
    showLineNumbers = false,
    wrap = false,
    copyLabels,
    onCopyCode,
    className,
    style,
    ...rest
  },
  ref,
) {
  const isDark = useIsDark();
  const colors: ThemeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const tokens = useMemo(() => tokensFor(code, language), [code, language]);
  const html = useMemo(
    () => (showLineNumbers ? null : highlightCode(code, tokens, colors)),
    [code, tokens, colors, showLineNumbers],
  );
  const lines = useMemo(() => {
    if (!showLineNumbers) return null;
    const all = highlightLines(code, tokens, colors);
    // A trailing newline ends the last line; it does not start a new one.
    if (all.length > 1 && code.endsWith("\n")) all.pop();
    return all;
  }, [code, tokens, colors, showLineNumbers]);

  const [copyState, setCopyState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Latest props at click time, without re-creating the handler.
  const latest = useRef({ code, onCopyCode });
  latest.current = { code, onCopyCode };

  const onCopyClick = useCallback(async () => {
    const { code: text, onCopyCode: report } = latest.current;
    // Raw `code`, never the highlighted HTML. `defaultClipboardWriter` throws
    // when `navigator.clipboard` is absent (SSR, insecure context), and
    // `runWriter` turns a throw, rejection or hang into `false`.
    const ok = await runWriter(defaultClipboardWriter, { kind: "code", text, html: "" });
    setCopyState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), FEEDBACK_MS);
    report?.({ text, ok });
  }, []);

  const labels = {
    copy: copyLabels?.copy ?? "Copy code",
    copied: copyLabels?.copied ?? "Copied",
    failed: copyLabels?.failed ?? "Copy failed",
  };
  const label = copyState === "copied" ? labels.copied : copyState === "failed" ? labels.failed : labels.copy;
  const hasHeader = title != null && title !== false;
  const floating = copyable && !hasHeader;

  const copyButton = copyable ? (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      icon={copyState === "copied" ? "check" : copyState === "failed" ? "x" : "copy"}
      aria-label={label}
      title={label}
      data-react-fancy-code-block-copy=""
      data-copy-state={copyState}
      onClick={onCopyClick}
      className={cn(
        floating && "opacity-80 group-hover:opacity-100 focus-visible:opacity-100",
      )}
      style={floating ? { backgroundColor: colors.background } : undefined}
    >
      {/* Visible feedback; idle is icon-only when floating over the code. */}
      {copyState !== "idle" ? label : hasHeader ? "Copy" : undefined}
    </Button>
  ) : null;

  const gutterWidth = lines ? `${String(lines.length).length}ch` : undefined;

  return (
    <div
      ref={ref}
      data-react-fancy-code-block=""
      data-language={language}
      data-wrap={wrap ? "true" : "false"}
      className={cn(
        "group relative overflow-hidden rounded-lg border",
        className,
      )}
      style={{
        backgroundColor: colors.background,
        color: colors.foreground,
        borderColor: colors.gutterBorder,
        // `relative` inline too: the floating button and the live region are
        // absolute, and must not escape a host whose Tailwind lacks the class.
        position: "relative",
        ...style,
      }}
      {...rest}
    >
      {hasHeader && (
        <div
          data-react-fancy-code-block-header=""
          className="flex items-center justify-between gap-2 border-b py-1 pl-3 pr-1 text-xs"
          style={{
            backgroundColor: colors.gutterBackground,
            color: colors.gutterForeground,
            borderColor: colors.gutterBorder,
          }}
        >
          <span data-react-fancy-code-block-title="" className="min-w-0 truncate font-mono">
            {title}
          </span>
          {copyButton}
        </div>
      )}

      <pre
        data-react-fancy-code-block-pre=""
        className={cn(TEXT_METRICS, "border-none", wrap ? "overflow-x-hidden" : "overflow-x-auto", floating && "pr-12")}
        style={{
          whiteSpace: wrap ? "pre-wrap" : "pre",
          overflowWrap: wrap ? "break-word" : "normal",
          backgroundColor: "transparent",
          color: "inherit",
        }}
      >
        {lines ? (
          <code
            data-react-fancy-code-block-code=""
            style={{ display: wrap ? "block" : "inline-block", minWidth: "100%" }}
          >
            {lines.map((lineHtml, i) => (
              <span key={i} data-react-fancy-code-block-line={i + 1} style={{ display: "flex" }}>
                <span
                  data-react-fancy-code-block-line-number=""
                  aria-hidden="true"
                  className="select-none"
                  style={{
                    flex: "none",
                    width: gutterWidth,
                    marginRight: "1.5ch",
                    textAlign: "right",
                    color: colors.gutterForeground,
                    userSelect: "none",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  data-react-fancy-code-block-line-content=""
                  style={{ flex: "1 1 auto", minWidth: 0 }}
                  dangerouslySetInnerHTML={{ __html: lineHtml }}
                />
              </span>
            ))}
          </code>
        ) : (
          <code data-react-fancy-code-block-code="" dangerouslySetInnerHTML={{ __html: html ?? "" }} />
        )}
      </pre>

      {floating && (
        <div
          data-react-fancy-code-block-actions=""
          className="absolute right-2 top-2"
          style={{ position: "absolute", right: "0.5rem", top: "0.5rem" }}
        >
          {copyButton}
        </div>
      )}

      {copyable && (
        <span role="status" aria-live="polite" className="sr-only" style={visuallyHidden}>
          {copyState === "idle" ? "" : label}
        </span>
      )}
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

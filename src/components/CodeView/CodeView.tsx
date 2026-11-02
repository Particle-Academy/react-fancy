import { useEffect, useMemo, useRef } from "react";
import {
  highlightCode,
  tokenize,
  LIGHT_COLORS,
  DARK_COLORS,
  type ThemeColors,
} from "@particle-academy/fancy-file-commons";
import { cn } from "../../utils/cn";
import { useIsDark } from "./use-is-dark";
import type { CodeViewProps } from "./CodeView.types";

// Shared text metrics — the overlay and the textarea MUST match exactly (font,
// size, line-height, padding, wrapping) so the highlighted glyphs sit under the
// caret. Keep this string identical on both layers.
const TEXT_METRICS = "m-0 p-3 font-mono text-xs leading-relaxed";

/**
 * A lightweight, syntax-highlighted source view built on the pure highlight
 * primitives in `@particle-academy/fancy-file-commons` — a highlight overlay
 * with a transparent, auto-growing textarea on top; the container scrolls both
 * together. Fills its parent's height (`h-full`) and grows with content down to
 * `minHeight`. Highlights every language fancy-file-commons ships (see
 * `CodeViewProps.language`); anything else renders as plain text.
 */
export function CodeView({
  value,
  onChange,
  language = "plaintext",
  readOnly = false,
  placeholder,
  minHeight = 120,
  maxHeight,
  className,
}: CodeViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isDark = useIsDark();
  const colors: ThemeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const highlighted = useMemo(() => {
    const tokens = tokenize(value, language) ?? [];
    return highlightCode(value, tokens, colors);
  }, [value, language, colors]);

  // Grow the textarea to its content height so it never scrolls internally —
  // the outer container owns scrolling and moves overlay + textarea in lockstep.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const editable = !readOnly && !!onChange;

  return (
    <div
      data-react-fancy-code-view=""
      // No baked-in height: the consumer picks the fill mechanism — `flex-1`
      // inside a flex column (the Editor source body), or `h-full` when the
      // parent has a definite height. A hard-coded `h-full` here collapses to
      // content height under a flex-computed (indefinite) parent.
      className={cn("relative overflow-auto", className)}
      style={{ backgroundColor: colors.background, color: colors.foreground, minHeight, maxHeight }}
    >
      <div className="relative min-h-full">
        {/* Highlight overlay */}
        <pre
          aria-hidden="true"
          className={cn("pointer-events-none absolute inset-0 overflow-hidden border-none", TEXT_METRICS)}
          style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}
        >
          <code dangerouslySetInnerHTML={{ __html: highlighted + "\n" }} />
        </pre>

        {/* Placeholder */}
        {placeholder && value.length === 0 && (
          <div className={cn("pointer-events-none absolute left-0 top-0 opacity-40", TEXT_METRICS)}>
            {placeholder}
          </div>
        )}

        {/* Transparent input layer (caret + selection visible, glyphs from overlay) */}
        <textarea
          ref={textareaRef}
          data-react-fancy-code-view-input=""
          value={value}
          onChange={editable ? (e) => onChange!(e.target.value) : undefined}
          readOnly={!editable}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label={placeholder}
          className={cn(
            "relative block w-full resize-none border-none bg-transparent text-transparent outline-none",
            TEXT_METRICS,
          )}
          style={{
            caretColor: colors.cursorColor,
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            minHeight,
          }}
        />
      </div>
    </div>
  );
}

CodeView.displayName = "CodeView";

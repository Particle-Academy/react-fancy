import { useEffect, useMemo, useRef } from "react";
import { highlightCodeWithVariables, tokenize } from "@particle-academy/fancy-file-commons";
import { cn } from "../../utils/cn";
import {
  CODE_PALETTE_ATTR,
  CODE_PALETTE_DARK_CLASS,
  CODE_PALETTE_STYLE,
  paletteColor,
} from "./code-palette";
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
  label,
  minHeight = 120,
  maxHeight,
  className,
}: CodeViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Snippet mode: PHP without an opening `<?php` is read as PHP. Colours come
  // from the palette variables on the root, so server and client render the
  // same markup in either theme (see code-palette).
  const highlighted = useMemo(() => {
    const tokens = tokenize(value, language, { snippet: true }) ?? [];
    return highlightCodeWithVariables(value, tokens);
  }, [value, language]);

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
      // Code is left-to-right whatever the page's direction. The overlay and the
      // transparent textarea must also agree on it exactly, or the caret drifts
      // off the glyphs it sits over.
      dir="ltr"
      // No baked-in height: the consumer picks the fill mechanism — `flex-1`
      // inside a flex column (the Editor source body), or `h-full` when the
      // parent has a definite height. A hard-coded `h-full` here collapses to
      // content height under a flex-computed (indefinite) parent.
      {...{ [CODE_PALETTE_ATTR]: "" }}
      className={cn("relative overflow-auto", CODE_PALETTE_DARK_CLASS, className)}
      style={{
        ...CODE_PALETTE_STYLE,
        backgroundColor: paletteColor("background"),
        color: paletteColor("foreground"),
        minHeight,
        maxHeight,
      }}
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
          // Always named (axe `label`): the host's label, else the placeholder
          // (what it named before), else "Code".
          aria-label={label ?? placeholder ?? "Code"}
          className={cn(
            "relative block w-full resize-none border-none bg-transparent text-transparent outline-none",
            TEXT_METRICS,
          )}
          style={{
            caretColor: paletteColor("cursorColor"),
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

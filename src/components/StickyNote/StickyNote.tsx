import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import type { StickyNoteColor, StickyNoteProps } from "./StickyNote.types";

// Preset paper colors → bg + text classes. An arbitrary CSS color string
// falls through to an inline `background` (text stays a dark ink tone).
const colorClasses: Record<StickyNoteColor, string> = {
  yellow: "bg-amber-100 text-amber-950 dark:bg-amber-200 dark:text-amber-950",
  blue: "bg-sky-100 text-sky-950 dark:bg-sky-200 dark:text-sky-950",
  green: "bg-emerald-100 text-emerald-950 dark:bg-emerald-200 dark:text-emerald-950",
  pink: "bg-pink-100 text-pink-950 dark:bg-pink-200 dark:text-pink-950",
  violet: "bg-violet-100 text-violet-950 dark:bg-violet-200 dark:text-violet-950",
};

const isPreset = (c: string): c is StickyNoteColor => c in colorClasses;

/**
 * A sticky note — paper-styled, with optional inline text editing.
 *
 * Presentational primitive only: it owns the note's look and its editable
 * text. Positioning, dragging, resizing, and z-order are the consumer's job
 * (e.g. `fancy-whiteboard`'s `<Board>` places it in world space;
 * `fancy-artboard`'s `<ArtBoard.Note>` positions it absolutely).
 *
 *   <StickyNote value={text} onChange={setText} color="yellow" rotate={-2} />
 */
export const StickyNote = forwardRef<HTMLDivElement, StickyNoteProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      color = "yellow",
      rotate = 0,
      width = 180,
      height = "auto",
      selected = false,
      editable = true,
      autoFocus = false,
      id,
      children,
      className,
      style,
    },
    ref,
  ) => {
    const isControlled = value !== undefined;
    const [internal, setInternal] = useState(defaultValue ?? "");
    const text = isControlled ? value : internal;
    const editRef = useRef<HTMLDivElement>(null);

    // Push text into the contentEditable node only when it differs AND the node
    // isn't focused — editing in place must not yank the caret to the start.
    useEffect(() => {
      const el = editRef.current;
      if (el && document.activeElement !== el && el.textContent !== text) {
        el.textContent = text ?? "";
      }
    }, [text]);

    // Focus + caret-to-end when editing turns on (consumer "enter edit" gesture).
    useEffect(() => {
      if (!editable || !autoFocus) return;
      const el = editRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, [editable, autoFocus]);

    const commit = () => {
      const next = editRef.current?.textContent ?? "";
      if (next === text) return;
      if (!isControlled) setInternal(next);
      onChange?.(next);
    };

    const preset = isPreset(color);
    const content =
      children != null ? (
        children
      ) : editable ? (
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          role="textbox"
          aria-multiline="true"
          className="outline-none whitespace-pre-wrap break-words min-h-[1.4em]"
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.blur();
          }}
        >
          {text}
        </div>
      ) : (
        <div className="whitespace-pre-wrap break-words">{text}</div>
      );

    return (
      <div
        ref={ref}
        id={id}
        data-react-fancy-sticky=""
        className={cn(
          "rounded-sm p-3.5 text-sm leading-relaxed shadow-[0_2px_8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]",
          preset ? colorClasses[color] : "text-zinc-900",
          selected && "ring-2 ring-blue-500 ring-offset-1",
          className,
        )}
        style={{
          width,
          height,
          transform: rotate ? `rotate(${rotate}deg)` : undefined,
          ...(preset ? null : { background: color }),
          ...style,
        }}
      >
        {content}
      </div>
    );
  },
);

StickyNote.displayName = "StickyNote";

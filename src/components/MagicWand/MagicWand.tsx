import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../Action";
import { Badge } from "../Badge";
import { Textarea } from "../inputs/Textarea/Textarea";

/**
 * MagicWand — selection-anchored floating toolbar for text inputs.
 *
 * When the user highlights text inside the wrapped <Textarea>, a small
 * pill of AI quick-actions floats above the selection. Clicking an
 * action invokes the host callback with the selected substring + range;
 * the host returns a replacement string and MagicWand swaps it in-place.
 *
 *   <MagicWand
 *     value={body}
 *     onValueChange={setBody}
 *     actions={[
 *       { id: "rephrase", label: "Rephrase", hint: "same meaning, different words",
 *         run: async (s) => await ai.rephrase(s) },
 *       …
 *     ]}
 *   />
 *
 * Two appearances: `"floating"` (default — full labels) and `"pill"`
 * (icon-only, compact). Auto-hides on click-away or scroll by default.
 */
export type MagicWandSelection = { start: number; end: number; text: string };

export type MagicWandAction = {
  /** Stable id, also shown as the busy-state key. */
  id: string;
  /** Display label (first character used in `pill` mode). */
  label: string;
  /** Tooltip body. */
  hint?: string;
  /** Optional kind chip rendered next to the label. */
  tag?: string;
  /** Returns the replacement text for the selection. */
  run: (selection: string, range: MagicWandSelection) => Promise<string> | string;
};

export type MagicWandAppearance = "pill" | "floating";

export interface MagicWandProps {
  /** Controlled textarea value. */
  value: string;
  /** Called on every edit. */
  onValueChange: (v: string) => void;
  /** Action list. */
  actions: MagicWandAction[];
  /** Visual treatment. Defaults to "floating". */
  appearance?: MagicWandAppearance;
  /** Auto-hide the wand on click-away or scroll. Defaults to true. */
  autoHide?: boolean;
  /** Textarea rows. */
  rows?: number;
  /** Placeholder. */
  placeholder?: string;
  /** Called after an action runs successfully. */
  onAction?: (action: MagicWandAction, selection: MagicWandSelection, replacement: string) => void;
}

export function MagicWand({
  value,
  onValueChange,
  actions,
  appearance = "floating",
  autoHide = true,
  rows = 6,
  placeholder,
  onAction,
}: MagicWandProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wandRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<MagicWandSelection | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const measureSelection = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (start === end) {
      setSel(null);
      setPos(null);
      return;
    }
    const text = ta.value.slice(start, end);
    setSel({ start, end, text });
    const rect = caretRect(ta, start, end);
    if (rect) setPos({ x: rect.x, y: rect.y });
  }, []);

  useEffect(() => {
    if (!autoHide) return;
    const onScroll = () => {
      setSel(null);
      setPos(null);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [autoHide]);

  useEffect(() => {
    if (!autoHide) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (wandRef.current?.contains(e.target as Node)) return;
      if (taRef.current?.contains(e.target as Node)) return;
      setSel(null);
      setPos(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [autoHide]);

  const handleAction = async (action: MagicWandAction) => {
    if (!sel) return;
    setBusy(action.id);
    try {
      const replacement = await action.run(sel.text, sel);
      const next = value.slice(0, sel.start) + replacement + value.slice(sel.end);
      onValueChange(next);
      onAction?.(action, sel, replacement);
    } finally {
      setBusy(null);
      setSel(null);
      setPos(null);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={taRef as unknown as React.Ref<HTMLTextAreaElement>}
        value={value}
        onValueChange={onValueChange}
        onSelect={measureSelection}
        onKeyUp={measureSelection}
        onMouseUp={measureSelection}
        rows={rows}
        placeholder={placeholder}
      />
      {sel && pos && (
        <Wand
          ref={wandRef}
          pos={pos}
          actions={actions}
          appearance={appearance}
          busy={busy}
          onAction={handleAction}
          selectionLength={sel.text.length}
        />
      )}
    </div>
  );
}

function Wand({
  ref,
  pos,
  actions,
  appearance,
  busy,
  onAction,
  selectionLength,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  pos: { x: number; y: number };
  actions: MagicWandAction[];
  appearance: MagicWandAppearance;
  busy: string | null;
  onAction: (a: MagicWandAction) => void;
  selectionLength: number;
}) {
  return (
    <div
      ref={ref}
      className="absolute z-20 -translate-x-1/2 -translate-y-full"
      style={{ left: pos.x, top: pos.y - 6 }}
    >
      <div className="flex items-center gap-1 rounded-full border border-violet-300 bg-white px-1.5 py-1 shadow-lg ring-1 ring-violet-200 dark:border-violet-700 dark:bg-zinc-900 dark:ring-violet-900">
        <span className="ml-1 mr-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-violet-700 dark:text-violet-300">
          <span aria-hidden>✦</span>
          {appearance === "floating" && (
            <Badge color="violet">{selectionLength} chars</Badge>
          )}
        </span>
        {actions.map((a) => (
          <Button
            key={a.id}
            size="sm"
            variant="ghost"
            onClick={() => onAction(a)}
            disabled={busy !== null}
            title={a.hint}
          >
            {busy === a.id ? "…" : appearance === "pill" ? a.label[0] : a.label}
            {appearance === "floating" && a.tag && (
              <span className="ml-1 rounded-full bg-zinc-100 px-1 text-[9px] font-medium text-zinc-500 dark:bg-zinc-800">
                {a.tag}
              </span>
            )}
          </Button>
        ))}
      </div>
      <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-px">
        <div className="h-2 w-2 rotate-45 border-b border-r border-violet-300 bg-white dark:border-violet-700 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

/**
 * Caret/selection geometry: mirror the textarea into a hidden div and
 * measure the selected substring's bounding rect. Not perfect for
 * resized textareas, but works for typical chat composers.
 */
function caretRect(
  ta: HTMLTextAreaElement,
  start: number,
  end: number,
): { x: number; y: number } | null {
  const div = document.createElement("div");
  const style = getComputedStyle(ta);
  const props = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "lineHeight",
    "fontFamily",
    "textAlign",
    "textTransform",
    "textIndent",
    "letterSpacing",
    "wordSpacing",
    "tabSize",
  ] as const;
  for (const p of props) (div.style as any)[p] = (style as any)[p];
  div.style.position = "absolute";
  div.style.top = "-9999px";
  div.style.left = "-9999px";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";

  const value = ta.value;
  div.textContent = value.substring(0, start);
  const startSpan = document.createElement("span");
  startSpan.textContent = value.substring(start, end) || ".";
  div.appendChild(startSpan);

  document.body.appendChild(div);
  const taRect = ta.getBoundingClientRect();
  const parentRect =
    (ta.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? taRect;
  const spanRect = startSpan.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  const offsetX = spanRect.left - divRect.left;
  const offsetY = spanRect.top - divRect.top;
  document.body.removeChild(div);

  const x = taRect.left - parentRect.left + offsetX + spanRect.width / 2;
  const y = taRect.top - parentRect.top + offsetY - ta.scrollTop;
  return { x, y };
}

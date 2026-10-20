import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "../Button";
import { Badge } from "../Badge";
import { Portal } from "../Portal";
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
 * Pass `target` to act on a textarea, input or editor the HOST renders instead:
 * MagicWand then renders no textarea of its own, only the floating wand.
 *
 *   <textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} />
 *   <MagicWand target={ref} value={body} onValueChange={setBody} actions={…} />
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

/** A viewport rectangle, the shape `getBoundingClientRect()` returns. */
export type MagicWandRect = { left: number; top: number; width: number; height: number };

/**
 * How MagicWand reads a selection out of an editor it does not own — a code
 * editor, a contenteditable, anything that is not a plain textarea.
 *
 * Read-only on purpose. The write goes through `onValueChange`, like every other
 * edit, so the host's `value` stays the one source of truth and the editor is
 * updated the way it always is: from that value.
 */
export interface MagicWandTargetAdapter {
  /**
   * The editor's element. MagicWand listens on it for `mouseup` / `keyup` /
   * `select` to know the selection may have changed, and treats a click inside
   * it as "not away" for `autoHide`.
   */
  element: RefObject<HTMLElement | null> | HTMLElement | null;
  /** The selection as offsets into `value`. `null` or `start === end` hides the wand. */
  getSelection: () => { start: number; end: number } | null;
  /** Where the selection is on screen. Default: the top-centre of `element`. */
  getSelectionRect?: () => MagicWandRect | null;
}

/** A host-owned textarea / input by ref, or an adapter for anything else. */
export type MagicWandTarget =
  | RefObject<HTMLTextAreaElement | HTMLInputElement | null>
  | MagicWandTargetAdapter;

export interface MagicWandProps {
  /** Controlled value — of the built-in textarea, or of `target`. */
  value: string;
  /** Called on every edit, and with the result of an action. */
  onValueChange: (v: string) => void;
  /** Action list. */
  actions: MagicWandAction[];
  /**
   * Act on a textarea / input / editor the host renders, instead of rendering
   * one. A ref to a textarea or input works as is; anything else takes a
   * `MagicWandTargetAdapter`. `value` must still be the target's current value.
   */
  target?: MagicWandTarget;
  /** Visual treatment. Defaults to "floating". */
  appearance?: MagicWandAppearance;
  /** Auto-hide the wand on click-away or scroll. Defaults to true. */
  autoHide?: boolean;
  /** Textarea rows (built-in textarea only). */
  rows?: number;
  /** Placeholder (built-in textarea only). */
  placeholder?: string;
  /** Called after an action runs successfully. */
  onAction?: (action: MagicWandAction, selection: MagicWandSelection, replacement: string) => void;
}

function isAdapter(target: MagicWandTarget): target is MagicWandTargetAdapter {
  return typeof (target as MagicWandTargetAdapter).getSelection === "function";
}

function targetElement(target: MagicWandTarget | undefined): HTMLElement | null {
  if (!target) return null;
  if (!isAdapter(target)) return target.current;
  const el = target.element;
  if (!el) return null;
  return el instanceof HTMLElement ? el : el.current;
}

type TextField = HTMLTextAreaElement | HTMLInputElement;

/** The selection and the viewport point the wand should sit above, or null. */
function readTarget(
  target: MagicWandTarget,
): { start: number; end: number; point: { x: number; y: number } } | null {
  if (!isAdapter(target)) {
    const field = target.current as TextField | null;
    if (!field) return null;
    const start = field.selectionStart ?? 0;
    const end = field.selectionEnd ?? 0;
    if (start === end) return null;
    return { start, end, point: selectionPoint(field, start, end) };
  }

  const range = target.getSelection();
  if (!range || range.start === range.end) return null;
  const rect = target.getSelectionRect?.() ?? targetElement(target)?.getBoundingClientRect() ?? null;
  const point = rect ? { x: rect.left + rect.width / 2, y: rect.top } : { x: 0, y: 0 };
  return { start: Math.min(range.start, range.end), end: Math.max(range.start, range.end), point };
}

export function MagicWand({
  value,
  onValueChange,
  actions,
  target,
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

  const external = target !== undefined;
  // Latest value + target for the listeners, which attach once per element.
  const latest = useRef({ value, target });
  latest.current = { value, target };

  const hide = useCallback(() => {
    setSel(null);
    setPos(null);
  }, []);

  const measureSelection = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (start === end) {
      hide();
      return;
    }
    const text = ta.value.slice(start, end);
    setSel({ start, end, text });
    // The built-in wand is positioned inside this component's `relative` box.
    const point = selectionPoint(ta, start, end);
    const box = (ta.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? ta.getBoundingClientRect();
    setPos({ x: point.x - box.left, y: point.y - box.top });
  }, [hide]);

  const measureTarget = useCallback(() => {
    const { target: t, value: v } = latest.current;
    if (!t) return;
    const read = readTarget(t);
    if (!read) {
      hide();
      return;
    }
    setSel({ start: read.start, end: read.end, text: v.slice(read.start, read.end) });
    setPos(read.point);
  }, [hide]);

  // The target's element is only known after the host renders it, so it is
  // re-resolved after every render and the listeners move if it changes.
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const next = targetElement(target);
    if (next !== targetEl) setTargetEl(next);
  });

  useEffect(() => {
    if (!targetEl) return;
    const events = ["mouseup", "keyup", "select"] as const;
    for (const e of events) targetEl.addEventListener(e, measureTarget);
    return () => {
      for (const e of events) targetEl.removeEventListener(e, measureTarget);
    };
  }, [targetEl, measureTarget]);

  useEffect(() => {
    if (!autoHide) return;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [autoHide, hide]);

  useEffect(() => {
    if (!autoHide) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const node = e.target as Node;
      if (wandRef.current?.contains(node)) return;
      if (taRef.current?.contains(node)) return;
      if (targetElement(latest.current.target)?.contains(node)) return;
      hide();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [autoHide, hide]);

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
      hide();
    }
  };

  const wand =
    sel && pos ? (
      <Wand
        ref={wandRef}
        pos={pos}
        fixed={external}
        actions={actions}
        appearance={appearance}
        busy={busy}
        onAction={handleAction}
        selectionLength={sel.text.length}
      />
    ) : null;

  if (external) {
    return wand ? <Portal>{wand}</Portal> : null;
  }

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
      {wand}
    </div>
  );
}

function Wand({
  ref,
  pos,
  fixed,
  actions,
  appearance,
  busy,
  onAction,
  selectionLength,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  pos: { x: number; y: number };
  /** Viewport-positioned (portalled, for an external target) rather than inside the wrapper. */
  fixed: boolean;
  actions: MagicWandAction[];
  appearance: MagicWandAppearance;
  busy: string | null;
  onAction: (a: MagicWandAction) => void;
  selectionLength: number;
}) {
  return (
    <div
      ref={ref}
      data-react-fancy-magic-wand=""
      className={`${fixed ? "fixed z-50" : "absolute z-20"} -translate-x-1/2 -translate-y-full`}
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
            data-react-fancy-magic-wand-action={a.id}
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
 * Caret/selection geometry: mirror the field into a hidden div and measure the
 * selected substring's bounding rect. Returns the VIEWPORT point at the top
 * centre of the selection. Not perfect for resized textareas, but works for
 * typical chat composers.
 */
function selectionPoint(ta: TextField, start: number, end: number): { x: number; y: number } {
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
  const spanRect = startSpan.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  const offsetX = spanRect.left - divRect.left;
  const offsetY = spanRect.top - divRect.top;
  document.body.removeChild(div);

  return {
    x: taRect.left + offsetX + spanRect.width / 2,
    y: taRect.top + offsetY - ta.scrollTop,
  };
}

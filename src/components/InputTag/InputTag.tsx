import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * InputTag — attach a `/`-style or `@`-style autocomplete picker to *any*
 * text surface (a `<textarea>`, an `<input>`, a `contenteditable`, a code
 * editor, a sheet cell editor, a whiteboard sticky note…) via an adapter
 * that abstracts the surface's read/write/caret API.
 *
 * The component is "headless" in the sense that it has no input of its
 * own — it floats a small picker menu near the surface and writes back
 * through the adapter when the user picks an item.
 *
 *   <textarea ref={ref} value={text} onChange={...} />
 *   <InputTag
 *     adapter={textareaAdapter(ref)}
 *     triggers={{
 *       "/": { items: commands, insert: (c) => `${c.name} ` },
 *       "@": { items: mentions, insert: (m) => `@${m.name} ` },
 *     }}
 *   />
 *
 * For non-DOM surfaces, write a small adapter that conforms to
 * {@link InputTagAdapter}. Adapters typically run 20–40 lines.
 */

/** What the surface tells the picker on every text/caret change. */
export type InputTagAdapterState = {
  text: string;
  caretIndex: number;
};

/**
 * The contract every input surface implements. The picker subscribes to
 * state changes, anchors itself using `getAnchorRect`, intercepts
 * navigation keys via `onKey`, and writes the selected item back through
 * `replaceRange`.
 */
export type InputTagAdapter = {
  /** Push current state whenever text or caret changes. Returns an unsubscribe. */
  subscribe: (fn: (state: InputTagAdapterState) => void) => () => void;
  /** Replace text in `[start, end)` with `replacement`. The adapter is
   *  responsible for moving the caret to the end of the inserted text. */
  replaceRange: (start: number, end: number, replacement: string) => void;
  /** Screen-space rect to anchor the picker against. Usually the surface's
   *  bounding rect; for editors that can compute caret-precise coordinates,
   *  return a small rect there instead. */
  getAnchorRect: () => DOMRect | null;
  /** Subscribe to keydown events on the surface. The handler may return
   *  `true` to consume the event (the adapter then calls
   *  `preventDefault` / `stopPropagation`). Returns an unsubscribe. */
  onKey: (handler: (e: KeyboardEvent) => boolean) => () => void;
};

/**
 * Per-trigger configuration. `T` is the item shape — typically a
 * `{ id, name, ... }` object, but any shape works as long as `keyOf` /
 * `insert` know how to handle it.
 */
export type InputTagTrigger<T> = {
  /** The pool the picker filters against. */
  items: T[];
  /** Text inserted in place of `<triggerChar><query>`. */
  insert: (item: T, query: string) => string;
  /** Custom filter. Default: case-insensitive prefix match against
   *  `String(keyOf(item))`. Pass `() => true` to disable filtering and
   *  rely on `items` being pre-filtered (e.g. from an async source). */
  filter?: (item: T, query: string) => boolean;
  /** How to render each row. Default renders the result of `keyOf(item)`. */
  render?: (item: T, active: boolean) => ReactNode;
  /** How to derive a stable key + default label for each item. Default
   *  reads `item.name` then `item.id` then `String(item)`. */
  keyOf?: (item: T) => string;
  /** Optional header label shown above the list. */
  label?: string;
};

export type InputTagTriggers = Record<string, InputTagTrigger<any>>;

export interface InputTagProps {
  adapter: InputTagAdapter;
  triggers: InputTagTriggers;
  /** Max rows shown. Default 8. */
  maxItems?: number;
  /** Where the picker anchors relative to the surface. Default `"bottom-left"`. */
  placement?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  /** Custom class for the popover container. */
  className?: string;
  /** Inline style for the popover container. */
  style?: CSSProperties;
  /** Fires whenever an item is picked. */
  onPick?: (info: { triggerChar: string; query: string; item: unknown }) => void;
};

type ActiveTrigger = {
  char: string;
  start: number;
  end: number;
  query: string;
};

function defaultKeyOf(item: unknown): string {
  if (item && typeof item === "object") {
    const r = item as Record<string, unknown>;
    if (typeof r.name === "string") return r.name;
    if (typeof r.id === "string") return r.id;
  }
  return String(item);
}

function defaultFilter(item: unknown, query: string): boolean {
  if (!query) return true;
  return defaultKeyOf(item).toLowerCase().includes(query.toLowerCase());
}

/**
 * Walk back from `caret` to detect an active trigger. A trigger is active
 * when one of the configured characters appears between `caret` and the
 * nearest preceding whitespace (or start-of-text), with no other
 * non-trigger-non-whitespace breaks. The "query" is everything after
 * the trigger up to the caret.
 */
function detectTrigger(
  text: string,
  caret: number,
  triggerChars: Set<string>,
): ActiveTrigger | null {
  for (let i = caret - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === undefined) break;
    if (triggerChars.has(ch)) {
      // Must be at a word boundary: start of text OR preceded by whitespace.
      if (i === 0 || /\s/.test(text[i - 1])) {
        return {
          char: ch,
          start: i,
          end: caret,
          query: text.slice(i + 1, caret),
        };
      }
      return null;
    }
    if (/\s/.test(ch)) return null;
  }
  return null;
}

export function InputTag({
  adapter,
  triggers,
  maxItems = 8,
  placement = "bottom-left",
  className,
  style,
  onPick,
}: InputTagProps) {
  const triggerChars = useMemo(() => new Set(Object.keys(triggers)), [triggers]);
  const [active, setActive] = useState<ActiveTrigger | null>(null);
  const [cursor, setCursor] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // Latest state in refs so key handlers see fresh data without re-registering.
  const stateRef = useRef<InputTagAdapterState>({ text: "", caretIndex: 0 });
  const activeRef = useRef<ActiveTrigger | null>(null);
  const cursorRef = useRef(0);
  activeRef.current = active;
  cursorRef.current = cursor;

  // Filtered items for the active trigger.
  const items: unknown[] = useMemo(() => {
    if (!active) return [];
    const cfg = triggers[active.char];
    if (!cfg) return [];
    const filter = cfg.filter ?? defaultFilter;
    const out: unknown[] = [];
    for (const item of cfg.items) {
      if (filter(item, active.query)) out.push(item);
      if (out.length >= maxItems) break;
    }
    return out;
  }, [active, triggers, maxItems]);

  // Subscribe to text/caret changes.
  useEffect(() => {
    return adapter.subscribe((s) => {
      stateRef.current = s;
      const next = detectTrigger(s.text, s.caretIndex, triggerChars);
      setActive((prev) => {
        // Reset cursor when the trigger char or position changes.
        if (!prev || !next || prev.char !== next.char || prev.start !== next.start) {
          setCursor(0);
        }
        return next;
      });
      if (next) setAnchorRect(adapter.getAnchorRect());
    });
  }, [adapter, triggerChars]);

  // Refresh anchor rect on scroll/resize while picker is open.
  useLayoutEffect(() => {
    if (!active) return;
    const update = () => setAnchorRect(adapter.getAnchorRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, adapter]);

  // Clamp cursor when the visible items shrink.
  useEffect(() => {
    if (cursor >= items.length) setCursor(Math.max(0, items.length - 1));
  }, [items.length, cursor]);

  const pickItem = useCallback(
    (item: unknown) => {
      const cur = activeRef.current;
      if (!cur) return;
      const cfg = triggers[cur.char];
      if (!cfg) return;
      const replacement = cfg.insert(item, cur.query);
      adapter.replaceRange(cur.start, cur.end, replacement);
      onPick?.({ triggerChar: cur.char, query: cur.query, item });
      setActive(null);
    },
    [adapter, triggers, onPick],
  );

  // Key handling.
  useEffect(() => {
    return adapter.onKey((e) => {
      const cur = activeRef.current;
      if (!cur) return false;
      const visible = items;
      switch (e.key) {
        case "ArrowDown":
          if (visible.length === 0) return false;
          setCursor((c) => (c + 1) % visible.length);
          return true;
        case "ArrowUp":
          if (visible.length === 0) return false;
          setCursor((c) => (c - 1 + visible.length) % visible.length);
          return true;
        case "Enter":
        case "Tab": {
          if (visible.length === 0) return false;
          const idx = Math.min(cursorRef.current, visible.length - 1);
          pickItem(visible[idx]);
          return true;
        }
        case "Escape":
          setActive(null);
          return true;
        default:
          return false;
      }
    });
  }, [adapter, items, pickItem]);

  if (!active || !anchorRect || items.length === 0) return null;

  const cfg = triggers[active.char];
  if (!cfg) return null;

  const popStyle = computePopoverStyle(anchorRect, placement);

  return (
    <div
      role="listbox"
      aria-label={cfg.label ?? `Pick a ${active.char === "/" ? "command" : "mention"}`}
      className={[
        "fixed z-50 w-72 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...popStyle, ...style }}
    >
      {(cfg.label || active.query) && (
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          <span>{cfg.label ?? labelForChar(active.char)}</span>
          {active.query && (
            <span className="font-mono text-[10px] normal-case tracking-normal text-zinc-400">
              {active.char}
              {active.query}
            </span>
          )}
        </div>
      )}
      <ul className="max-h-60 overflow-y-auto">
        {items.map((item, i) => {
          const renderer = cfg.render ?? ((it: unknown) => <span>{defaultKeyOf(it)}</span>);
          const active2 = i === cursor;
          const key = (cfg.keyOf ?? defaultKeyOf)(item);
          return (
            <li
              key={key}
              role="option"
              aria-selected={active2}
              onMouseDown={(e) => {
                e.preventDefault();
                pickItem(item);
              }}
              onMouseEnter={() => setCursor(i)}
              className={[
                "cursor-pointer px-2 py-1.5 text-[12px]",
                active2
                  ? "bg-violet-100 dark:bg-violet-900/30"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
              ].join(" ")}
            >
              {renderer(item, active2)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function labelForChar(ch: string): string {
  if (ch === "/") return "Commands";
  if (ch === "@") return "Mentions";
  if (ch === "#") return "Tags";
  if (ch === ":") return "Emoji";
  return `Trigger ${ch}`;
}

function computePopoverStyle(
  anchor: DOMRect,
  placement: NonNullable<InputTagProps["placement"]>,
): CSSProperties {
  const offset = 4;
  switch (placement) {
    case "bottom-right":
      return { top: anchor.bottom + offset, right: window.innerWidth - anchor.right };
    case "top-left":
      return { bottom: window.innerHeight - anchor.top + offset, left: anchor.left };
    case "top-right":
      return { bottom: window.innerHeight - anchor.top + offset, right: window.innerWidth - anchor.right };
    case "bottom-left":
    default:
      return { top: anchor.bottom + offset, left: anchor.left };
  }
}

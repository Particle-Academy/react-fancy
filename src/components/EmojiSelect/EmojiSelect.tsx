import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { EMOJI_CATEGORY_ORDER, EMOJI_DATA, type EmojiCategoryKey, type EmojiEntry } from "../../data/emoji-data";
import { applyTone, SKIN_TONES, type SkinTone } from "../../data/emoji-utils";
import type { EmojiSelectProps } from "./EmojiSelect.types";

const TONE_STORAGE_KEY = "fancy:emoji-tone";
const LONG_PRESS_MS = 400;
const HOVER_INTENT_MS = 120;
const HOVER_LEAVE_GRACE_MS = 220;

type ToneTarget = {
  emoji: EmojiEntry;
  rect: { left: number; top: number; width: number };
};

// Deliberately no hover-capability gate. We use `pointerType` on pointer events so touch
// inputs never trigger the hover path (they go through long-press instead), and mouse/pen
// inputs always work regardless of what `(hover: hover)` resolves to in the current env.

function readStoredTone(): SkinTone | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage?.getItem(TONE_STORAGE_KEY);
    return (SKIN_TONES as readonly string[]).includes(v ?? "") ? (v as SkinTone) : null;
  } catch {
    return null;
  }
}

export function EmojiSelect({ value, defaultValue, onChange, placeholder = "Search emojis...", className }: EmojiSelectProps) {
  const [selected, setSelected] = useControllableState(value, defaultValue ?? "", onChange);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<EmojiCategoryKey>("smileys");
  const [tone, setToneState] = useState<SkinTone | null>(() => readStoredTone());
  const [toneTarget, setToneTarget] = useState<ToneTarget | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTone = useCallback((t: SkinTone | null) => {
    setToneState(t);
    if (typeof window === "undefined") return;
    try {
      if (t) window.localStorage?.setItem(TONE_STORAGE_KEY, t);
      else window.localStorage?.removeItem(TONE_STORAGE_KEY);
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    if (!query) return null;
    const lower = query.toLowerCase();
    const hits: EmojiEntry[] = [];
    for (const group of Object.values(EMOJI_DATA)) {
      for (const e of group.emojis) {
        if (e.name.includes(lower)) hits.push(e);
      }
    }
    return hits;
  }, [query]);

  const closePicker = useCallback(() => setToneTarget(null), []);

  const openPicker = useCallback((target: ToneTarget) => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setToneTarget(target);
  }, []);

  const scheduleClose = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(closePicker, HOVER_LEAVE_GRACE_MS);
  }, [closePicker]);

  const cancelClose = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  const pick = (emoji: EmojiEntry) => {
    const char = emoji.skinTones && tone ? applyTone(emoji.char, tone) : emoji.char;
    setSelected(char);
    setOpen(false);
    setQuery("");
    closePicker();
  };

  const pickTone = (emoji: EmojiEntry, t: SkinTone) => {
    setTone(t);
    const char = applyTone(emoji.char, t);
    setSelected(char);
    setOpen(false);
    setQuery("");
    closePicker();
  };

  useEffect(() => {
    if (!open) closePicker();
  }, [open, closePicker]);

  return (
    <div className={cn("relative inline-block", className)} data-react-fancy-emoji-select="">
      <button
        type="button"
        className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm transition-[border-color,box-shadow] duration-150 dark:border-zinc-700 dark:bg-[#1e1e24]"
        onClick={() => setOpen((v) => !v)}
      >
        {selected ? <span className="text-xl">{selected}</span> : <span className="text-zinc-400">Pick emoji</span>}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-80 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800 fancy-fade-in">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="mb-2 w-full rounded-md border border-zinc-200 px-2 py-1 text-sm transition-[border-color,box-shadow] duration-150 dark:border-zinc-700 dark:bg-[#1e1e24] dark:text-zinc-100"
            autoFocus
          />

          {!query && (
            <div className="mb-2 flex gap-1 overflow-x-auto border-b border-zinc-100 pb-2 dark:border-zinc-700">
              {EMOJI_CATEGORY_ORDER.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCategory(key)}
                  className={cn(
                    "shrink-0 rounded p-1 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-700",
                    activeCategory === key && "bg-zinc-100 dark:bg-zinc-700",
                  )}
                  aria-label={EMOJI_DATA[key].label}
                >
                  {EMOJI_DATA[key].icon}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {query ? (
              <EmojiGrid
                emojis={filtered ?? []}
                tone={tone}
                openPicker={openPicker}
                scheduleClose={scheduleClose}
                cancelClose={cancelClose}
                onPick={pick}
              />
            ) : (
              <div>
                <div className="px-1 py-1 text-xs font-semibold uppercase text-zinc-500">
                  {EMOJI_DATA[activeCategory].label}
                </div>
                <EmojiGrid
                  emojis={EMOJI_DATA[activeCategory].emojis}
                  tone={tone}
                  openPicker={openPicker}
                  scheduleClose={scheduleClose}
                  cancelClose={cancelClose}
                  onPick={pick}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {toneTarget && typeof document !== "undefined" &&
        createPortal(
          <TonePopover
            target={toneTarget}
            onPickBase={() => pick(toneTarget.emoji)}
            onPickTone={(t) => pickTone(toneTarget.emoji, t)}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          />,
          document.body,
        )}
    </div>
  );
}

type GridProps = {
  emojis: EmojiEntry[];
  tone: SkinTone | null;
  openPicker: (target: ToneTarget) => void;
  scheduleClose: () => void;
  cancelClose: () => void;
  onPick: (emoji: EmojiEntry) => void;
};

function EmojiGrid({ emojis, tone, openPicker, scheduleClose, cancelClose, onPick }: GridProps) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      {emojis.map((emoji) => (
        <EmojiCell
          key={emoji.char}
          emoji={emoji}
          tone={tone}
          openPicker={openPicker}
          scheduleClose={scheduleClose}
          cancelClose={cancelClose}
          onPick={() => onPick(emoji)}
        />
      ))}
    </div>
  );
}

type CellProps = {
  emoji: EmojiEntry;
  tone: SkinTone | null;
  openPicker: (target: ToneTarget) => void;
  scheduleClose: () => void;
  cancelClose: () => void;
  onPick: () => void;
};

function EmojiCell({ emoji, tone, openPicker, scheduleClose, cancelClose, onPick }: CellProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const tonable = !!emoji.skinTones;
  const displayChar = tonable && tone ? applyTone(emoji.char, tone) : emoji.char;

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const triggerOpen = () => {
    const node = buttonRef.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    openPicker({ emoji, rect: { left: r.left, top: r.top, width: r.width } });
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (!tonable || e.pointerType === "touch") return;
    cancelClose();
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(triggerOpen, HOVER_INTENT_MS);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    if (tonable) scheduleClose();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!tonable || e.pointerType !== "touch") return;
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      triggerOpen();
    }, LONG_PRESS_MS);
  };
  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const handleClick = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onPick();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative rounded p-1 text-xl hover:bg-zinc-100 dark:hover:bg-zinc-700"
      aria-label={emoji.name}
      title={emoji.name}
    >
      {displayChar}
      {tonable && (
        <span className="absolute right-0.5 bottom-0.5 h-1 w-1 rounded-full bg-amber-400" aria-hidden />
      )}
    </button>
  );
}

type PopoverProps = {
  target: ToneTarget;
  onPickBase: () => void;
  onPickTone: (tone: SkinTone) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

function TonePopover({ target, onPickBase, onPickTone, onMouseEnter, onMouseLeave }: PopoverProps) {
  const { emoji, rect } = target;
  if (!emoji.skinTones) return null;

  const centerX = rect.left + rect.width / 2;
  const top = rect.top;
  const POPOVER_HEIGHT_APPROX = 44;
  const flipDown = top < POPOVER_HEIGHT_APPROX + 8;

  const style: React.CSSProperties = flipDown
    ? { position: "fixed", left: centerX, top: top + 32, transform: "translateX(-50%)" }
    : { position: "fixed", left: centerX, top: top - 4, transform: "translate(-50%, -100%)" };

  return (
    <div
      style={{ ...style, zIndex: 9999 }}
      className="flex gap-0.5 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        onClick={onPickBase}
        className="rounded p-1 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
        aria-label={`${emoji.name} (no tone)`}
      >
        {emoji.char}
      </button>
      {SKIN_TONES.map((t, i) => (
        <button
          key={t}
          type="button"
          onClick={() => onPickTone(t)}
          className="rounded p-1 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
          aria-label={`${emoji.name} ${t} skin tone`}
        >
          {emoji.skinTones![i]}
        </button>
      ))}
    </div>
  );
}

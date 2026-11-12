import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { SmilePlus } from "lucide-react";
import { cn } from "../../utils/cn";
import { fillLabel } from "../../utils/label-template";
import { inlineStep } from "../../utils/direction";
import { useId } from "../../hooks/use-id";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { Portal } from "../Portal";
import { DEFAULT_CONTENT_REACTIONS, toggleReaction } from "./reactions";
import type { ContentReactionItem, ContentReactionProps } from "./ContentReaction.types";

const DEFAULT_LABELS = {
  trigger: "React",
  menu: "Reactions",
  triggerActive: "{trigger}: {reactions}",
  itemCount: "{label} ({count})",
};

const SIZES = {
  sm: { trigger: "h-7 gap-1 px-2 text-xs", glyph: "text-sm", icon: "size-3.5", item: "size-8 text-lg" },
  md: { trigger: "h-8 gap-1.5 px-2.5 text-sm", glyph: "text-base", icon: "size-4", item: "size-9 text-xl" },
  lg: { trigger: "h-10 gap-2 px-3 text-base", glyph: "text-lg", icon: "size-5", item: "size-11 text-2xl" },
} as const;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))] dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]";

/** The active highlight: a muted fill and an accent ring, both theme tokens. */
const ON =
  "bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] ring-1 ring-[color:var(--fancy-accent,var(--color-blue-600))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))] dark:ring-[color:var(--fancy-accent-dark,var(--color-blue-500))]";

const ITEM_SELECTOR = '[role="menuitemcheckbox"]';

/**
 * An emoji-reaction control for a piece of content. A compact trigger shows the
 * active reactions (or a "React" placeholder); it opens a portalled picker of
 * `menuitemcheckbox`es that toggle.
 *
 * There is no hover behaviour at all, on purpose. Pickers that open on hover
 * and close on mouse-leave lose the pointer in the gap between the trigger and
 * the picker. This one opens on click or the keyboard, and closes on an outside
 * click, Escape, or a select when `closeOnSelect` is on.
 */
export function ContentReaction({
  value,
  onChange,
  reactions = DEFAULT_CONTENT_REACTIONS,
  mode = "multi",
  counts,
  mine,
  size = "md",
  disabled = false,
  placement = "top-start",
  closeOnSelect,
  triggerLabel,
  renderTrigger,
  labels: labelsProp,
  id,
  className,
  ...rest
}: ContentReactionProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const label = triggerLabel ?? labels.trigger;
  const shouldClose = closeOnSelect ?? mode === "single";
  const sizes = SIZES[size];

  const autoId = useId("content-reaction");
  const baseId = id ?? autoId;
  const menuId = `${baseId}-menu`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuEl, setMenuEl] = useState<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<"first" | "last" | null>(null);

  const position = useFloatingPosition(triggerRef, floatingRef, { placement, offset: 6, enabled: open });
  const positioned = position.x !== -9999 && position.y !== -9999;

  const close = useCallback((returnFocus: boolean) => {
    pendingFocus.current = null;
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const closeQuietly = useCallback(() => close(false), [close]);
  useOutsideClick(floatingRef, closeQuietly, open, triggerRef);
  useEscapeKey(() => close(true), open);

  // Never opened while disabled; and a control disabled while open closes.
  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  const setMenuRef = useCallback((node: HTMLDivElement | null) => {
    floatingRef.current = node;
    setMenuEl(node);
  }, []);

  const focusItem = useCallback((menu: HTMLElement | null, index: number) => {
    const el = menu?.querySelectorAll<HTMLElement>(ITEM_SELECTOR)[index];
    if (!el) return;
    setActiveIndex(index);
    el.focus({ preventScroll: true });
  }, []);

  // Opened from the keyboard: focus the first / last item once the picker exists.
  // The picker mounts a render after `open` (Portal's mount gate), so this keys
  // on the element itself rather than on `open`.
  useEffect(() => {
    if (!open || !menuEl) return;
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    focusItem(menuEl, target === "first" ? 0 : reactions.length - 1);
  }, [open, menuEl, reactions.length, focusItem]);

  const openWith = (target: "first" | "last" | null) => {
    if (disabled) return;
    if (open) {
      if (target) focusItem(menuEl, target === "first" ? 0 : reactions.length - 1);
      return;
    }
    pendingFocus.current = target;
    if (target) setActiveIndex(target === "first" ? 0 : reactions.length - 1);
    setOpen(true);
  };

  const select = (key: string, index: number) => {
    if (disabled) return;
    setActiveIndex(index);
    const { next, on } = toggleReaction(value, key, mode);
    onChange?.(next, { key, on });
    if (shouldClose) {
      const focusInMenu = !!menuEl && menuEl.contains(document.activeElement);
      close(focusInMenu);
    }
  };

  // WAI-ARIA menu button: Enter / Space / ArrowDown open on the first item,
  // ArrowUp on the last. Enter / Space are handled here and their native click
  // suppressed (keydown for Enter, keyup for Space), so a key press toggles once.
  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || e.defaultPrevented) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openWith(e.key === "ArrowDown" ? "first" : "last");
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) close(false);
      else openWith("first");
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const menu = e.currentTarget;
    const count = reactions.length;
    if (count === 0) return;
    const focused = (document.activeElement as HTMLElement | null)?.closest?.(ITEM_SELECTOR) as HTMLElement | null;
    const current = focused && menu.contains(focused) ? Number(focused.dataset.index) : activeIndex;

    let next: number | null = null;
    const step = inlineStep(e.key, menu);
    if (step !== 0) next = (current + step + count) % count;
    else if (e.key === "ArrowDown") next = (current + 1) % count;
    else if (e.key === "ArrowUp") next = (current - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;

    if (next !== null) {
      e.preventDefault();
      focusItem(menu, next);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const r = reactions[current];
      if (r) select(r.key, current);
      return;
    }

    if (e.key === "Tab") {
      // The picker stays open (it closes only on an outside click, Escape or a
      // select), but focus must not be stranded at the end of <body> where the
      // portal lives: hand it back to the trigger, and let the browser's own Tab
      // continue from the trigger's place in the tab order.
      triggerRef.current?.focus();
    }
  };

  // What the trigger shows: the active reactions, or with `counts`, every
  // reaction with a count above 0 (plus any of mine the count has not caught up with).
  const mineKeys = mine ?? value;
  const mineSet = new Set(mineKeys);
  const valueSet = new Set(value);
  const countOf = (key: string) => counts?.[key] ?? 0;
  const shown: ContentReactionItem[] = counts
    ? reactions.filter((r) => countOf(r.key) > 0 || mineSet.has(r.key))
    : reactions.filter((r) => valueSet.has(r.key));

  const triggerName =
    shown.length === 0
      ? label
      : fillLabel(labels.triggerActive, {
          trigger: label,
          reactions: shown
            .map((r) => (counts && countOf(r.key) > 0 ? `${r.label} ${countOf(r.key)}` : r.label))
            .join(", "),
        });

  let triggerContent: ReactNode;
  if (renderTrigger) {
    triggerContent = renderTrigger({ value, active: shown, counts, mine: mineKeys, open, disabled, label });
  } else if (shown.length === 0) {
    triggerContent = (
      <>
        <SmilePlus aria-hidden="true" className={cn("shrink-0", sizes.icon)} />
        <span data-react-fancy-content-reaction-placeholder="">{label}</span>
      </>
    );
  } else {
    triggerContent = shown.map((r) => (
      <span
        key={r.key}
        data-react-fancy-content-reaction-chip=""
        data-reaction-key={r.key}
        data-mine={String(mineSet.has(r.key))}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full",
          counts && "px-1",
          counts && mineSet.has(r.key) && ON,
        )}
      >
        <span data-react-fancy-content-reaction-emoji="" aria-hidden="true" className={cn("leading-none", sizes.glyph)}>
          {r.emoji}
        </span>
        {counts && countOf(r.key) > 0 && (
          <span className="tabular-nums text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]">
            {countOf(r.key)}
          </span>
        )}
      </span>
    ));
  }

  return (
    <div
      {...rest}
      id={baseId}
      data-react-fancy-content-reaction=""
      data-value={value.join(",")}
      data-mode={mode}
      data-size={size}
      data-open={String(open)}
      data-disabled={disabled ? "true" : undefined}
      className={cn("inline-flex", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        id={`${baseId}-trigger`}
        data-react-fancy-content-reaction-trigger=""
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerName}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) close(false);
          else openWith(null);
        }}
        onKeyDown={onTriggerKeyDown}
        onKeyUp={(e) => {
          if (e.key === " ") e.preventDefault();
        }}
        className={cn(
          "inline-flex items-center rounded-full border transition-colors",
          "border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] text-[color:var(--fancy-text-soft,var(--color-zinc-700))] hover:bg-[color:var(--fancy-surface-hover,var(--color-zinc-50))]",
          "dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))] dark:hover:bg-[color:var(--fancy-surface-hover-dark,color-mix(in_oklab,var(--color-zinc-800)_50%,transparent))]",
          FOCUS_RING,
          sizes.trigger,
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {triggerContent}
      </button>

      {open && (
        <Portal>
          <div
            ref={setMenuRef}
            id={menuId}
            role="menu"
            aria-label={labels.menu}
            aria-orientation="horizontal"
            data-react-fancy-content-reaction-menu=""
            data-placement={position.placement}
            dir={position.dir}
            onKeyDown={onMenuKeyDown}
            className={cn(
              "fixed z-50 flex items-center gap-1 rounded-full border p-1 shadow-lg",
              "border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))]",
              "dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:shadow-zinc-950/50",
              // Transparent rather than `invisible` until measured: a hidden
              // element cannot take focus, and keyboard opening focuses an item
              // in the same frame.
              positioned ? "fancy-scale-in" : "pointer-events-none opacity-0",
            )}
            style={{ left: position.x, top: position.y }}
          >
            {reactions.map((r, i) => {
              const on = valueSet.has(r.key);
              const name = counts ? fillLabel(labels.itemCount, { label: r.label, count: countOf(r.key) }) : r.label;
              return (
                <div
                  key={r.key}
                  role="menuitemcheckbox"
                  aria-checked={on}
                  aria-label={name}
                  title={name}
                  tabIndex={i === activeIndex ? 0 : -1}
                  data-index={i}
                  data-react-fancy-content-reaction-item=""
                  data-reaction-key={r.key}
                  data-state={on ? "on" : "off"}
                  onClick={() => select(r.key, i)}
                  className={cn(
                    "relative inline-flex cursor-pointer select-none items-center justify-center rounded-full transition-[background-color,transform] duration-150 hover:scale-110",
                    "hover:bg-[color:var(--fancy-surface-hover,var(--color-zinc-50))] dark:hover:bg-[color:var(--fancy-surface-hover-dark,color-mix(in_oklab,var(--color-zinc-800)_50%,transparent))]",
                    FOCUS_RING,
                    sizes.item,
                    on && ON,
                  )}
                >
                  <span data-react-fancy-content-reaction-emoji="" aria-hidden="true" className="leading-none">
                    {r.emoji}
                  </span>
                  {counts && countOf(r.key) > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 -end-1 min-w-4 rounded-full px-1 text-center text-[10px] font-medium leading-4 tabular-nums bg-[color:var(--fancy-surface,var(--color-white))] text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]"
                    >
                      {countOf(r.key)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Portal>
      )}
    </div>
  );
}

ContentReaction.displayName = "ContentReaction";

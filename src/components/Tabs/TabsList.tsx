import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { inlineStep } from "../../utils/direction";
import { TabsListContext, useTabs } from "./Tabs.context";
import type { TabsListProps } from "./Tabs.types";

export function TabsList({ children, className }: TabsListProps) {
  // Reads the context so an activeTab change re-renders the list and re-derives.
  const { variant } = useTabs();
  const listRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState<HTMLElement | null>(null);
  // The last value handed to setFallback. Compared BEFORE setting, so nothing
  // is dispatched when nothing changed: an updater that returns `prev` still
  // makes React schedule a render whenever it cannot bail out eagerly, and from
  // a layout effect that render is a synchronous nested update (error #185 in
  // a host that re-renders often).
  const fallbackRef = useRef<HTMLElement | null>(null);

  // Which tab holds the stop when none is active. Read from the rendered
  // tablist, the same source the arrow keys use, so "first" means first in
  // the DOM whatever wraps the tabs. Tabs of a nested tablist are skipped.
  const refresh = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const own = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]')).filter(
      (el) => el.closest('[role="tablist"]') === list,
    );
    const anyActive = own.some((el) => el.getAttribute("aria-selected") === "true");
    const next = anyActive
      ? null
      : (own.find((el) => !(el as HTMLButtonElement).disabled) ?? null);
    if (next === fallbackRef.current) return;
    fallbackRef.current = next;
    setFallback(next);
  }, []);

  // No dependency array on purpose, and in particular not `children`, whose
  // identity is new on every parent render that maps its tabs. Re-deriving
  // after each commit of the list covers reordering, which no tab reports
  // itself. It terminates by construction: a second pass over an unchanged
  // DOM finds the same tab and sets nothing.
  useLayoutEffect(() => {
    refresh();
  });

  const listCtx = useMemo(() => ({ fallback, refresh }), [fallback, refresh]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([disabled])',
    );
    if (!buttons?.length) return;

    const items = Array.from(buttons);
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    // ArrowRight / ArrowLeft follow the VISUAL order: in RTL the next tab is
    // to the left, so ArrowLeft moves forward.
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : inlineStep(e.key, listRef.current);
    if (step === 1) {
      e.preventDefault();
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[next].focus();
      items[next].click();
    } else if (step === -1) {
      e.preventDefault();
      const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prev].focus();
      items[prev].click();
    }
  }, []);

  return (
    <div
      data-react-fancy-tabs-list=""
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        "flex",
        variant === "underline" && "gap-0 border-b border-[color:var(--fancy-border,var(--color-zinc-200))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]",
        variant === "pills" && "gap-0 rounded-lg bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] p-1 dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]",
        variant === "boxed" &&
          "gap-0 rounded-lg bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] p-1 dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]",
        className,
      )}
    >
      <TabsListContext.Provider value={listCtx}>{children}</TabsListContext.Provider>
    </div>
  );
}

TabsList.displayName = "TabsList";

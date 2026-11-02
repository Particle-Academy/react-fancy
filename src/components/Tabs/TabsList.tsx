import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { TabsListContext, useTabs } from "./Tabs.context";
import type { TabsListProps } from "./Tabs.types";

export function TabsList({ children, className }: TabsListProps) {
  const { variant, activeTab } = useTabs();
  const listRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState<HTMLElement | null>(null);

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
    setFallback((prev) => (prev === next ? prev : next));
  }, []);

  useLayoutEffect(() => {
    refresh();
  }, [refresh, activeTab, children]);

  const listCtx = useMemo(() => ({ fallback, refresh }), [fallback, refresh]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([disabled])',
    );
    if (!buttons?.length) return;

    const items = Array.from(buttons);
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[next].focus();
      items[next].click();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
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

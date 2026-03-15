import { useCallback, useRef } from "react";
import { cn } from "../../utils/cn";
import { useTabs } from "./Tabs.context";
import type { TabsListProps } from "./Tabs.types";

export function TabsList({ children, className }: TabsListProps) {
  const { variant } = useTabs();
  const listRef = useRef<HTMLDivElement>(null);

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
        variant === "underline" && "gap-0 border-b border-zinc-200 dark:border-zinc-700",
        variant === "pills" && "gap-0 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800",
        variant === "boxed" &&
          "gap-0 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

TabsList.displayName = "TabsList";

import { useContext, useLayoutEffect, useMemo, useState, type Ref } from "react";
import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";
import { TabsListContext, useTabs } from "./Tabs.context";
import type { TabsTabProps } from "./Tabs.types";

export function TabsTab({
  children,
  value,
  disabled = false,
  className,
  onClick,
  ...rest
}: TabsTabProps) {
  const { activeTab, setActiveTab, variant } = useTabs();
  const list = useContext(TabsListContext);
  const isActive = activeTab === value;

  // The node lives in state, not a ref, so comparing it to the list's
  // fallback during render is a pure read.
  const [node, setNode] = useState<HTMLButtonElement | null>(null);
  const externalRef = (rest as { ref?: Ref<HTMLButtonElement> }).ref;
  const setRef = useMemo(() => composeRefs(externalRef, setNode), [externalRef]);

  // Re-derive the fallback when this tab changes in a way the list may not
  // have rendered for, and when it leaves.
  const refresh = list?.refresh;
  useLayoutEffect(() => {
    refresh?.();
    return () => refresh?.();
  }, [refresh, disabled, value]);

  // Roving tabindex: the active tab holds the stop. When no tab is active the
  // list names the first enabled one, so the tablist is never unreachable.
  const isStop = isActive || (node !== null && list?.fallback === node);

  return (
    <button
      data-react-fancy-tabs-tab=""
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isStop ? 0 : -1}
      onClick={(e) => { if (!disabled) setActiveTab(value); onClick?.(e); }}
      {...rest}
      ref={setRef}
      className={cn(
        "text-sm font-medium transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        variant === "underline" && [
          "border-b-2 px-4 py-2.5",
          isActive
            ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
            : "border-transparent text-[color:var(--fancy-text-muted,var(--color-zinc-500))] hover:border-zinc-300 hover:text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))] dark:hover:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]",
        ],
        variant === "pills" && [
          "rounded-md px-4 py-1.5",
          isActive
            ? "bg-[color:var(--fancy-surface,var(--color-white))] text-zinc-900 shadow-sm dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:text-white"
            // Soft, not muted: an inactive pill sits on the muted SURFACE, where
            // the muted text token is 4.39:1 (zinc-500 on zinc-100), under AA.
            // Soft is zinc-700 / zinc-300; the active tab still reads as active
            // through its raised chip and the strongest text colour.
            : "text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]",
        ],
        variant === "boxed" && [
          "flex-1 rounded-md px-4 py-1.5",
          isActive
            ? "bg-[color:var(--fancy-surface,var(--color-white))] text-zinc-900 shadow-sm dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:text-white"
            // Soft, not muted: an inactive pill sits on the muted SURFACE, where
            // the muted text token is 4.39:1 (zinc-500 on zinc-100), under AA.
            // Soft is zinc-700 / zinc-300; the active tab still reads as active
            // through its raised chip and the strongest text colour.
            : "text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]",
        ],
        className,
      )}
    >
      {children}
    </button>
  );
}

TabsTab.displayName = "TabsTab";

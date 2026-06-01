import { type ReactNode, useCallback } from "react";
import { Icon } from "../Icon";

/**
 * ChatDrawer — tabbed, collapsible panel that sits *above* a `PromptInput`
 * (via the input's `aboveInput` slot) so the drawer and composer share one
 * rounded shell. Each tab gets a numbered chip and a content panel; only
 * one panel renders at a time.
 *
 *   <PromptInput
 *     aboveInput={
 *       <ChatDrawer
 *         tabs={[
 *           { id: "files",   label: "Files" },
 *           { id: "tools",   label: "Chat Tools" },
 *           { id: "prompts", label: "Chat Prompts" },
 *           { id: "deal",    label: "IBM Analytics Platform" },
 *         ]}
 *         activeTabId={tab}
 *         onTabChange={setTab}
 *         open={open}
 *         onToggle={setOpen}
 *       >
 *         {tab === "tools" && <ToolsGrid />}
 *         {tab === "deal"  && <DealCard />}
 *       </ChatDrawer>
 *     }
 *     budgetTokens={200_000}
 *     onSubmit={(text) => send(text)}
 *   />
 *
 * The drawer is purely presentational and slot-driven — you decide what
 * each tab shows. Tab order in the numbered chips is the order you pass.
 */

export type ChatDrawerTab = {
  /** Stable id — used as the React key and as `activeTabId`. */
  id: string;
  /** Human label rendered on the chip. */
  label: string;
  /**
   * Optional override for the numbered prefix (defaults to position +1).
   * Set to `null` to hide the number entirely (e.g. for a context-specific
   * tab like the deal one in the screenshots).
   */
  number?: number | null;
};

export interface ChatDrawerProps {
  tabs: ChatDrawerTab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  /** Body open/closed. Default true. */
  open?: boolean;
  /** Called when the chevron is clicked. */
  onToggle?: (open: boolean) => void;
  /** Body content for the active tab. */
  children?: ReactNode;
  /** Min height of the body when open, in px. Default 140. */
  minBodyHeight?: number;
  className?: string;
}

export function ChatDrawer({
  tabs,
  activeTabId,
  onTabChange,
  open = true,
  onToggle,
  children,
  minBodyHeight = 140,
  className,
}: ChatDrawerProps) {
  const handleToggle = useCallback(() => {
    onToggle?.(!open);
  }, [onToggle, open]);

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab, i) => {
            const active = tab.id === activeTabId;
            const number = tab.number === null ? null : tab.number ?? i + 1;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={[
                  "group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition",
                  active
                    ? "border-violet-500 bg-violet-500 text-white"
                    : "border-zinc-200 bg-transparent text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800",
                ].join(" ")}
                aria-pressed={active}
              >
                {number !== null && (
                  <span
                    className={[
                      "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-zinc-200 text-zinc-600 group-hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300",
                    ].join(" ")}
                  >
                    {number}
                  </span>
                )}
                <span className="truncate max-w-[180px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={open ? "Collapse drawer" : "Expand drawer"}
          aria-expanded={open}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <Icon
            name={open ? "chevron-down" : "chevron-up"}
            className="h-3.5 w-3.5"
          />
        </button>
      </div>

      {open && (
        <div
          className="px-2.5 pb-2.5"
          style={{ minHeight: minBodyHeight }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

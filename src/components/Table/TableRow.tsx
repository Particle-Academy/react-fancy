import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import type { TableRowProps } from "./Table.types";

export function TableRow({
  children,
  className,
  onClick,
  tray,
  trayTriggerPosition = "end",
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpandedChange,
}: TableRowProps) {
  const [expanded, setExpanded] = useControllableState(
    controlledExpanded,
    defaultExpanded,
    onExpandedChange,
  );

  const hasTray = tray != null;
  const showTrigger = hasTray && trayTriggerPosition !== "hidden";

  const triggerCell = showTrigger ? (
    <td className="w-8 px-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="inline-flex items-center justify-center rounded p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
        aria-label={expanded ? "Collapse row" : "Expand row"}
      >
        <svg
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            expanded && "rotate-90",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </td>
  ) : null;

  return (
    <>
      <tr
        data-react-fancy-table-row=""
        className={cn(
          "transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
          onClick && "cursor-pointer",
          className,
        )}
        onClick={onClick}
      >
        {trayTriggerPosition === "start" && triggerCell}
        {children}
        {trayTriggerPosition === "end" && triggerCell}
      </tr>
      {hasTray && expanded && (
        <tr className="bg-zinc-50/50 dark:bg-zinc-800/30">
          <td colSpan={999}>
            {tray}
          </td>
        </tr>
      )}
    </>
  );
}

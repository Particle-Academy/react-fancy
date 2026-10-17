import { useId } from "react";
import { cn } from "../../utils/cn";
import { useCommand } from "./Command.context";
import type { CommandItemProps } from "./Command.types";

export function CommandItem({
  children,
  value,
  onSelect,
  className,
}: CommandItemProps) {
  const { query, close, shouldFilter, setActiveIndex } = useCommand();
  // Called before the filter's early return, so the hook order never changes.
  const id = useId();

  // Filter by query — unless the caller filters for itself (`shouldFilter={false}`).
  const text = value ?? (typeof children === "string" ? children : "");
  if (shouldFilter && query && !text.toLowerCase().includes(query.toLowerCase())) {
    return null;
  }

  return (
    <button
      id={id}
      data-react-fancy-command-item=""
      type="button"
      role="option"
      // Marked active by Command itself (aria-selected + data-active), since an
      // item cannot know its own position among the rendered options.
      aria-selected={false}
      // Keyboard focus stays in the input; the items are reached with the arrows.
      tabIndex={-1}
      onMouseEnter={(e) => {
        const options = e.currentTarget
          .closest("[data-react-fancy-command]")
          ?.querySelectorAll('[role="option"]');
        if (options) setActiveIndex(Array.from(options).indexOf(e.currentTarget));
      }}
      className={cn(
        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
        "text-zinc-700 hover:bg-zinc-100 data-[active]:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:data-[active]:bg-zinc-800",
        className,
      )}
      onClick={() => {
        onSelect?.();
        close();
      }}
    >
      {children}
    </button>
  );
}

CommandItem.displayName = "CommandItem";

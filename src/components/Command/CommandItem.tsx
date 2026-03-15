import { cn } from "../../utils/cn";
import { useCommand } from "./Command.context";
import type { CommandItemProps } from "./Command.types";

export function CommandItem({
  children,
  value,
  onSelect,
  className,
}: CommandItemProps) {
  const { query, close } = useCommand();

  // Filter by query
  const text = value ?? (typeof children === "string" ? children : "");
  if (query && !text.toLowerCase().includes(query.toLowerCase())) {
    return null;
  }

  return (
    <button
      data-react-fancy-command-item=""
      type="button"
      role="option"
      className={cn(
        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
        "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
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

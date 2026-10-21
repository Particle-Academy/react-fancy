import { Search } from "lucide-react";
import { cn } from "../../utils/cn";
import { useCommand } from "./Command.context";
import type { CommandInputProps } from "./Command.types";

export function CommandInput({
  placeholder = "Type a command or search...",
  className,
}: CommandInputProps) {
  const { query, setQuery, listId } = useCommand();

  return (
    <div data-react-fancy-command-input="" className="flex items-center border-b border-[color:var(--fancy-border,var(--color-zinc-200))] px-4 dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]">
      <Search size={16} className="shrink-0 text-zinc-400" />
      <input
        type="text"
        // A combobox: focus stays here while the arrows move the active option,
        // which Command announces through aria-activedescendant.
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-zinc-400",
          className,
        )}
        autoFocus
      />
    </div>
  );
}

CommandInput.displayName = "CommandInput";

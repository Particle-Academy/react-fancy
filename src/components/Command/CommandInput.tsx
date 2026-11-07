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
      <Search size={16} aria-hidden="true" className="shrink-0 text-[color:var(--fancy-text-faint,var(--color-zinc-400))] dark:text-[color:var(--fancy-text-faint-dark,var(--color-zinc-500))]" />
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
          "flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:placeholder:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]",
          className,
        )}
        autoFocus
      />
    </div>
  );
}

CommandInput.displayName = "CommandInput";

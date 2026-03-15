import { Search } from "lucide-react";
import { cn } from "../../utils/cn";
import { useCommand } from "./Command.context";
import type { CommandInputProps } from "./Command.types";

export function CommandInput({
  placeholder = "Type a command or search...",
  className,
}: CommandInputProps) {
  const { query, setQuery } = useCommand();

  return (
    <div data-react-fancy-command-input="" className="flex items-center border-b border-zinc-200 px-4 dark:border-zinc-700">
      <Search size={16} className="shrink-0 text-zinc-400" />
      <input
        type="text"
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

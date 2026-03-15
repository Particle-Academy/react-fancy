import { cn } from "../../utils/cn";
import type { CommandEmptyProps } from "./Command.types";

export function CommandEmpty({
  children = "No results found.",
  className,
}: CommandEmptyProps) {
  return (
    <div
      data-react-fancy-command-empty=""
      className={cn(
        "py-6 text-center text-sm text-zinc-500 dark:text-zinc-400",
        className,
      )}
    >
      {children}
    </div>
  );
}

CommandEmpty.displayName = "CommandEmpty";

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
        "py-6 text-center text-sm text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

CommandEmpty.displayName = "CommandEmpty";

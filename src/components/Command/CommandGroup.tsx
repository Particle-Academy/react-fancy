import { cn } from "../../utils/cn";
import type { CommandGroupProps } from "./Command.types";

export function CommandGroup({
  children,
  heading,
  className,
}: CommandGroupProps) {
  return (
    <div data-react-fancy-command-group="" role="group" className={cn("py-1", className)}>
      {heading && (
        <div className="px-3 py-1.5 text-xs font-medium text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

CommandGroup.displayName = "CommandGroup";

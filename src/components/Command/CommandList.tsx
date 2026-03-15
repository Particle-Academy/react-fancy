import { cn } from "../../utils/cn";
import type { CommandListProps } from "./Command.types";

export function CommandList({ children, className }: CommandListProps) {
  return (
    <div
      data-react-fancy-command-list=""
      role="listbox"
      className={cn("max-h-72 overflow-y-auto p-2", className)}
    >
      {children}
    </div>
  );
}

CommandList.displayName = "CommandList";

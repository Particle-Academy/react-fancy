import { cn } from "../../utils/cn";
import { useCommand } from "./Command.context";
import type { CommandListProps } from "./Command.types";

export function CommandList({ children, className }: CommandListProps) {
  const { listId } = useCommand();

  return (
    <div
      id={listId}
      data-react-fancy-command-list=""
      role="listbox"
      className={cn("max-h-72 overflow-y-auto p-2", className)}
    >
      {children}
    </div>
  );
}

CommandList.displayName = "CommandList";

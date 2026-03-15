import { cn } from "../../utils/cn";
import type { DropdownSeparatorProps } from "./Dropdown.types";

export function DropdownSeparator({ className }: DropdownSeparatorProps) {
  return (
    <div
      data-react-fancy-dropdown-separator=""
      role="separator"
      className={cn(
        "my-1 h-px bg-zinc-200 dark:bg-zinc-700",
        className,
      )}
    />
  );
}

DropdownSeparator.displayName = "DropdownSeparator";

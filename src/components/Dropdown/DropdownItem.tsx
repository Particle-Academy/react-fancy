import { cn } from "../../utils/cn";
import { useDropdown } from "./Dropdown.context";
import type { DropdownItemProps } from "./Dropdown.types";

export function DropdownItem({
  children,
  onClick,
  disabled = false,
  danger = false,
  className,
}: DropdownItemProps) {
  const { setOpen } = useDropdown();

  return (
    <button
      data-react-fancy-dropdown-item=""
      type="button"
      role="menuitem"
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          : "text-[color:var(--fancy-text-soft,var(--color-zinc-700))] hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))] dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

DropdownItem.displayName = "DropdownItem";

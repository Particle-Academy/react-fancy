import { useDropdown } from "./Dropdown.context";
import type { DropdownTriggerProps } from "./Dropdown.types";

export function DropdownTrigger({ children }: DropdownTriggerProps) {
  const { setOpen, open, anchorRef } = useDropdown();

  return (
    <span
      ref={anchorRef as React.RefObject<HTMLSpanElement>}
      data-react-fancy-dropdown-trigger=""
      className="inline-flex"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-haspopup="menu"
    >
      {children}
    </span>
  );
}

DropdownTrigger.displayName = "DropdownTrigger";

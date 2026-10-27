import type { KeyboardEvent, MouseEvent } from "react";
import { useDropdown } from "./Dropdown.context";
import { focusMenuItem } from "./dropdown-focus";
import type { DropdownTriggerProps } from "./Dropdown.types";

/**
 * Elements the browser itself turns Enter / Space into a click on. For these
 * the trigger lets the native click open the menu; for anything else (an
 * avatar span with `tabIndex`) it opens the menu itself.
 */
function activatesNatively(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "SUMMARY") return true;
  if (tag === "A") return el.hasAttribute("href");
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    return type === "button" || type === "submit" || type === "reset" || type === "image";
  }
  return false;
}

export function DropdownTrigger({ children }: DropdownTriggerProps) {
  const { setOpen, open, anchorRef, pendingFocusRef, menuRef } = useDropdown();

  // WAI-ARIA menu button: Enter / Space / ArrowDown open the menu on its first
  // item, ArrowUp on its last.
  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.defaultPrevented) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const target = e.key === "ArrowDown" ? "first" : "last";
      if (open && menuRef.current) {
        focusMenuItem(menuRef.current, target);
        return;
      }
      pendingFocusRef.current = target;
      setOpen(true);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      if (!open) pendingFocusRef.current = "first";
      if (activatesNatively(e.target)) return; // its click toggles the menu
      e.preventDefault();
      if (open) pendingFocusRef.current = null;
      setOpen(!open);
    }
  };

  const onClick = (_e: MouseEvent<HTMLSpanElement>) => {
    if (open) pendingFocusRef.current = null;
    setOpen(!open);
  };

  return (
    <span
      ref={anchorRef as React.RefObject<HTMLSpanElement>}
      data-react-fancy-dropdown-trigger=""
      className="inline-flex"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-expanded={open}
      aria-haspopup="menu"
    >
      {children}
    </span>
  );
}

DropdownTrigger.displayName = "DropdownTrigger";

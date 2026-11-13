import { useMemo, type KeyboardEvent, type MouseEvent } from "react";
import { useDropdown } from "./Dropdown.context";
import { focusMenuItem } from "./dropdown-focus";
import {
  classifyTriggerChild,
  cloneTriggerChild,
  composeRefs,
  popupTriggerAria,
  triggerChildRef,
  useTriggerClassNameCheck,
} from "../../utils/trigger-child";
import { cn } from "../../utils/cn";
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

/**
 * The menu button. Its ARIA (`aria-haspopup="menu"`, `aria-expanded`,
 * `aria-controls`) and the `data-react-fancy-dropdown-trigger` handle go on
 * the focusable child itself, merged with the props it already has. A child
 * nothing can focus (plain text, a bare `<span>`) is wrapped in a `<button>`
 * that carries them instead. A component child must forward its props and ref
 * to the element it renders, as `Button` does.
 */
export function DropdownTrigger({ children, className, ...rest }: DropdownTriggerProps) {
  const { setOpen, open, anchorRef, pendingFocusRef, menuRef, menuId } = useDropdown();

  const target = classifyTriggerChild(children);
  const childRef = triggerChildRef(target);
  const ref = useMemo(() => composeRefs(childRef, anchorRef), [childRef, anchorRef]);
  useTriggerClassNameCheck(anchorRef, className, "Dropdown.Trigger");

  // WAI-ARIA menu button: Enter / Space / ArrowDown open the menu on its first
  // item, ArrowUp on its last.
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.defaultPrevented) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const focusTarget = e.key === "ArrowDown" ? "first" : "last";
      if (open && menuRef.current) {
        focusMenuItem(menuRef.current, focusTarget);
        return;
      }
      pendingFocusRef.current = focusTarget;
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

  const onClick = (_e: MouseEvent<HTMLElement>) => {
    if (open) pendingFocusRef.current = null;
    setOpen(!open);
  };

  const aria = popupTriggerAria("menu", open, menuId);

  if (target.mode === "clone") {
    return cloneTriggerChild(target.element, {
      owned: {
        "data-react-fancy-dropdown-trigger": "",
        onClick,
        onKeyDown,
        ...(target.role ? { role: target.role } : {}),
        ...(target.aria ? aria : {}),
      },
      fallback: { ...rest, className },
      ref,
    });
  }

  return (
    <button
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      data-react-fancy-dropdown-trigger=""
      className={cn("inline-flex", className)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...aria}
    >
      {children}
    </button>
  );
}

DropdownTrigger.displayName = "DropdownTrigger";

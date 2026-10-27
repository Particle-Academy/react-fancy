import { useCallback, useMemo, useRef, useState } from "react";
import { DropdownContext } from "./Dropdown.context";
import { DropdownTrigger } from "./DropdownTrigger";
import { DropdownItems } from "./DropdownItems";
import { DropdownItem } from "./DropdownItem";
import { DropdownSeparator } from "./DropdownSeparator";
import type { DropdownProps } from "./Dropdown.types";

const TRIGGER_FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function DropdownRoot({
  children,
  placement = "bottom-start",
  offset = 4,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchorRef = useRef<HTMLElement>(null);
  const pendingFocusRef = useRef<"first" | "last" | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);

  const focusTrigger = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const target =
      anchor.querySelector<HTMLElement>(TRIGGER_FOCUSABLE) ?? (anchor.tabIndex >= 0 ? anchor : null);
    target?.focus();
  }, []);

  const ctx = useMemo(
    () => ({
      open,
      setOpen,
      anchorRef,
      activeIndex,
      setActiveIndex,
      placement,
      offset,
      pendingFocusRef,
      menuRef,
      focusTrigger,
    }),
    [open, anchorRef, activeIndex, placement, offset, focusTrigger],
  );

  return (
    <DropdownContext.Provider value={ctx}>{children}</DropdownContext.Provider>
  );
}

export const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  Items: DropdownItems,
  Item: DropdownItem,
  Separator: DropdownSeparator,
});

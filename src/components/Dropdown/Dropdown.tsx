import { useMemo, useRef, useState } from "react";
import { DropdownContext } from "./Dropdown.context";
import { DropdownTrigger } from "./DropdownTrigger";
import { DropdownItems } from "./DropdownItems";
import { DropdownItem } from "./DropdownItem";
import { DropdownSeparator } from "./DropdownSeparator";
import type { DropdownProps } from "./Dropdown.types";

function DropdownRoot({
  children,
  placement = "bottom-start",
  offset = 4,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchorRef = useRef<HTMLElement>(null);

  const ctx = useMemo(
    () => ({ open, setOpen, anchorRef, activeIndex, setActiveIndex, placement, offset }),
    [open, anchorRef, activeIndex, placement, offset],
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

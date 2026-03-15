import { useCallback, useEffect, useRef } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { useDropdown } from "./Dropdown.context";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useAnimation } from "../../hooks/use-animation";
import type { DropdownItemsProps } from "./Dropdown.types";

export function DropdownItems({ children, className }: DropdownItemsProps) {
  const { open, setOpen, anchorRef, activeIndex, setActiveIndex, placement, offset } =
    useDropdown();
  const floatingRef = useRef<HTMLDivElement>(null);
  const outsideRef = useRef<HTMLDivElement>(null);

  const position = useFloatingPosition(anchorRef, floatingRef, {
    placement,
    offset,
    enabled: open,
  });

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, [setOpen, setActiveIndex]);

  useOutsideClick(outsideRef, close, open);
  useEscapeKey(close, open);

  const { mounted, className: animClass, ref: animRef } = useAnimation({
    open,
    enterClass: "fancy-scale-in",
    exitClass: "fancy-fade-out",
  });

  useEffect(() => {
    if (!open || !floatingRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = floatingRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      );
      if (!items?.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(next);
        items[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
        setActiveIndex(prev);
        items[prev]?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, activeIndex, setActiveIndex]);

  if (!mounted) return null;

  return (
    <Portal>
      <div
        ref={(node) => {
          outsideRef.current = node;
          floatingRef.current = node;
          (animRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }}
        data-react-fancy-dropdown=""
        role="menu"
        className={cn(
          "fixed z-50 min-w-[8rem] rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
          animClass,
          className,
        )}
        style={{ left: position.x, top: position.y }}
      >
        {children}
      </div>
    </Portal>
  );
}

DropdownItems.displayName = "DropdownItems";

import { useCallback, useEffect, useRef, useState } from "react";
import { focusByChar, focusMenuItem, type FocusMove } from "./dropdown-focus";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { useDropdown } from "./Dropdown.context";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useAnimation } from "../../hooks/use-animation";
import type { DropdownItemsProps } from "./Dropdown.types";

export function DropdownItems({ children, className }: DropdownItemsProps) {
  const {
    open,
    setOpen,
    anchorRef,
    setActiveIndex,
    placement,
    offset,
    pendingFocusRef,
    menuRef,
    focusTrigger,
  } = useDropdown();
  const floatingRef = useRef<HTMLDivElement>(null);
  const outsideRef = useRef<HTMLDivElement>(null);

  const position = useFloatingPosition(anchorRef, floatingRef, {
    placement,
    offset,
    enabled: open,
  });

  const close = useCallback(() => {
    pendingFocusRef.current = null;
    setOpen(false);
    setActiveIndex(-1);
  }, [setOpen, setActiveIndex, pendingFocusRef]);

  useOutsideClick(outsideRef, close, open, anchorRef);
  // Escape closes THIS menu (the innermost layer) and returns focus to where
  // the menu came from. An outside click does not move focus: the user put it
  // somewhere already.
  useEscapeKey(() => {
    close();
    focusTrigger();
  }, open);

  const { mounted, className: animClass, ref: animRef } = useAnimation({
    open,
    enterClass: "fancy-scale-in",
    exitClass: "fancy-fade-out",
  });

  // The menu element, as STATE. It does not exist when `open` first turns true:
  // `useAnimation` mounts it a render later and `Portal` a render after that.
  // Before 5.64.1 the key handler lived in an effect keyed on `open` that
  // returned early while the element was null and never re-ran, so the arrow
  // keys did nothing in any Dropdown. Keying on the element itself fixes the
  // timing for good.
  const [menuEl, setMenuEl] = useState<HTMLDivElement | null>(null);

  const setMenuRef = useCallback(
    (node: HTMLDivElement | null) => {
      outsideRef.current = node;
      floatingRef.current = node;
      (animRef as React.MutableRefObject<HTMLElement | null>).current = node;
      menuRef.current = node;
      setMenuEl(node);
    },
    [animRef, menuRef],
  );

  // Opened from the keyboard: focus the first / last item once it exists.
  useEffect(() => {
    if (!open || !menuEl) return;
    const target = pendingFocusRef.current;
    if (!target) return;
    pendingFocusRef.current = null;
    setActiveIndex(focusMenuItem(menuEl, target));
  }, [open, menuEl, pendingFocusRef, setActiveIndex]);

  // Keys are handled on the menu itself: focus is inside it while it is driven
  // from the keyboard, and React delivers the event through the portal.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const menu = e.currentTarget;
    const moves: Record<string, FocusMove> = {
      ArrowDown: "next",
      ArrowUp: "prev",
      Home: "first",
      End: "last",
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      setActiveIndex(focusMenuItem(menu, move));
      return;
    }
    if (e.key === "Tab") {
      // Close, and put focus back on the trigger WITHOUT preventing the
      // default: the browser's own Tab then moves on from the trigger's place
      // in the tab order rather than from the end of <body>, where the
      // portalled menu lives.
      close();
      focusTrigger();
      return;
    }
    if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const i = focusByChar(menu, e.key);
      if (i >= 0) setActiveIndex(i);
    }
  };

  if (!mounted) return null;

  return (
    <Portal>
      <div
        ref={setMenuRef}
        data-react-fancy-dropdown=""
        role="menu"
        onKeyDown={onKeyDown}
        className={cn(
          "fixed z-50 min-w-[8rem] rounded-xl border border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] p-1 shadow-lg dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
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

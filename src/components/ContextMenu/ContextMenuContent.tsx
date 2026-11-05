import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { useContextMenu } from "./ContextMenu.context";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useAnimation } from "../../hooks/use-animation";
import { MenuGroupProvider } from "./ContextMenuSub";
import type { ContextMenuContentProps } from "./ContextMenu.types";

export function ContextMenuContent({
  children,
  className,
}: ContextMenuContentProps) {
  const { open, setOpen, position } = useContextMenu();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState<{ x: number; y: number }>(position);
  const rtl = position.dir === "rtl";

  const close = useCallback(() => setOpen(false), [setOpen]);
  useOutsideClick(menuRef, close, open);
  useEscapeKey(close, open);

  // Clamp position to viewport after mount
  useEffect(() => {
    const node = menuRef.current;
    if (!open || !node) {
      setAdjusted(position);
      return;
    }
    requestAnimationFrame(() => {
      const rect = node.getBoundingClientRect();
      const pad = 8;
      let x = position.x;
      let y = position.y;
      if (position.dir === "rtl") {
        // In RTL `x` is the menu's RIGHT edge (see the translate below).
        if (x - rect.width < pad) x = rect.width + pad;
        if (x > window.innerWidth - pad) x = window.innerWidth - pad;
      } else {
        if (x + rect.width > window.innerWidth - pad) x = window.innerWidth - rect.width - pad;
        if (x < pad) x = pad;
      }
      if (y + rect.height > window.innerHeight - pad) y = window.innerHeight - rect.height - pad;
      if (y < pad) y = pad;
      setAdjusted({ x, y });
    });
  }, [open, position]);

  const { mounted, className: animClass, ref: animRef } = useAnimation({
    open,
    enterClass: "fancy-scale-in",
    exitClass: "fancy-fade-out",
  });

  if (!mounted) return null;

  return (
    <Portal>
      <div
        ref={(node) => {
          menuRef.current = node;
          (animRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }}
        data-react-fancy-context-menu=""
        role="menu"
        className={cn(
          "fixed z-50 min-w-[8rem] rounded-xl border border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] p-1 shadow-lg dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
          animClass,
          className,
        )}
        dir={position.dir}
        // The menu opens toward the inline END of the pointer: rightward in
        // LTR, leftward in RTL. Translating by its own width anchors the RIGHT
        // edge at the pointer with no measurement, so the first frame is
        // already on the correct side.
        style={{ left: adjusted.x, top: adjusted.y, translate: rtl ? "-100% 0" : undefined }}
      >
        <MenuGroupProvider>
          {children}
        </MenuGroupProvider>
      </div>
    </Portal>
  );
}

ContextMenuContent.displayName = "ContextMenuContent";

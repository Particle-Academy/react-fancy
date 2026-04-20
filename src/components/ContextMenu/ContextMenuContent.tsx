import { useCallback, useRef } from "react";
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

  const close = useCallback(() => setOpen(false), [setOpen]);
  useOutsideClick(menuRef, close, open);
  useEscapeKey(close, open);

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
          "fixed z-50 min-w-[8rem] rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
          animClass,
          className,
        )}
        style={{ left: position.x, top: position.y }}
      >
        <MenuGroupProvider>
          {children}
        </MenuGroupProvider>
      </div>
    </Portal>
  );
}

ContextMenuContent.displayName = "ContextMenuContent";

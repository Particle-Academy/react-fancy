import {
  cloneElement,
  forwardRef,
  useCallback,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import type { TooltipProps } from "./Tooltip.types";

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(
    { children, content, placement = "top", delay = 200, offset = 8, className },
    _ref,
  ) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLElement>(null);
    const floatingRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const position = useFloatingPosition(anchorRef, floatingRef, {
      placement,
      offset,
      enabled: open,
    });

    const show = useCallback(() => {
      timeoutRef.current = setTimeout(() => setOpen(true), delay);
    }, [delay]);

    const hide = useCallback(() => {
      clearTimeout(timeoutRef.current);
      setOpen(false);
    }, []);

    const trigger = cloneElement(children as ReactElement<Record<string, unknown>>, {
      ref: anchorRef,
      onMouseEnter: show,
      onMouseLeave: hide,
      onFocus: show,
      onBlur: hide,
    });

    return (
      <>
        {trigger}
        {open && (
          <Portal>
            <div
              ref={floatingRef}
              data-react-fancy-tooltip=""
              role="tooltip"
              className={cn(
                "fancy-fade-in pointer-events-none fixed z-50 max-w-xs rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white shadow-lg dark:bg-zinc-700 dark:text-zinc-100",
                className,
              )}
              style={{ left: position.x, top: position.y }}
            >
              {content}
              <div
                className={cn(
                  "absolute h-2 w-2 rotate-45 bg-zinc-900 dark:bg-zinc-700",
                  position.placement.startsWith("top") &&
                    "bottom-[-4px] left-1/2 -translate-x-1/2",
                  position.placement.startsWith("bottom") &&
                    "top-[-4px] left-1/2 -translate-x-1/2",
                  position.placement.startsWith("left") &&
                    "right-[-4px] top-1/2 -translate-y-1/2",
                  position.placement.startsWith("right") &&
                    "left-[-4px] top-1/2 -translate-y-1/2",
                )}
              />
            </div>
          </Portal>
        )}
      </>
    );
  },
);

Tooltip.displayName = "Tooltip";

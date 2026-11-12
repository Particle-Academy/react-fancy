import {
  cloneElement,
  forwardRef,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from "react";
import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";
import { Portal } from "../Portal";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useEscapeKey } from "../../hooks/use-escape-key";
import type { TooltipProps } from "./Tooltip.types";

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(
    { children, content, placement = "top", delay = 200, offset = 8, className, describe = true },
    _ref,
  ) {
    const [open, setOpen] = useState(false);
    const tooltipId = useId();
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

    // A visible tooltip is a layer: Escape dismisses it (WCAG 1.4.13) before
    // anything under it, such as the full-screen surface it was opened in.
    useEscapeKey(hide, open);

    // The trigger is the caller's element, so its own ref and handlers have to
    // survive the clone. Overwriting them broke any child that needs its ref:
    // a <MultiSwitch> measures its thumb from it, and rendered with none.
    // className and every other prop are untouched — cloneElement keeps them.
    const child = children as ReactElement<Record<string, unknown>>;
    const childProps = child.props;
    const childRef = childProps.ref as Ref<HTMLElement> | undefined;
    const triggerRef = useMemo(() => composeRefs(childRef, anchorRef), [childRef]);
    const chain =
      (own: unknown, ours: () => void) =>
      (event: unknown) => {
        if (typeof own === "function") own(event);
        ours();
      };
    // While the tooltip is shown the trigger is described by it, added to any
    // description the child already names. Not before: the id only exists in
    // the DOM while the tooltip does.
    const ownDescribedBy =
      typeof childProps["aria-describedby"] === "string" ? childProps["aria-describedby"] : undefined;
    const describedBy = open && describe
      ? [ownDescribedBy, tooltipId].filter(Boolean).join(" ")
      : ownDescribedBy;
    const trigger = cloneElement(child, {
      ref: triggerRef,
      "aria-describedby": describedBy,
      onMouseEnter: chain(childProps.onMouseEnter, show),
      onMouseLeave: chain(childProps.onMouseLeave, hide),
      onFocus: chain(childProps.onFocus, show),
      onBlur: chain(childProps.onBlur, hide),
    });

    return (
      <>
        {trigger}
        {open && (
          <Portal>
            <div
              ref={floatingRef}
              id={tooltipId}
              data-react-fancy-tooltip=""
              role="tooltip"
              className={cn(
                "fancy-fade-in pointer-events-none fixed z-50 max-w-xs rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white shadow-lg dark:bg-zinc-700 dark:text-zinc-100",
                className,
              )}
              dir={position.dir}
              style={{ left: position.x, top: position.y }}
            >
              {content}
              <div
                className={cn(
                  // `bg-inherit`, not a colour of its own: a `className` that
                  // restyles the bubble would otherwise leave a dark arrow
                  // pointing out of a light one.
                  "absolute h-2 w-2 rotate-45 bg-inherit",
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

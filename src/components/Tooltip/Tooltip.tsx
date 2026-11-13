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
import { TRIGGER_CLASS_NAME_PROP } from "../../utils/trigger-child";
import { Portal } from "../Portal";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useEscapeKey } from "../../hooks/use-escape-key";
import type { TooltipProps } from "./Tooltip.types";

export const Tooltip = forwardRef<HTMLElement, TooltipProps>(
  function Tooltip(
    {
      children,
      content,
      placement = "top",
      delay = 200,
      offset = 8,
      className,
      triggerClassName,
      describe = true,
      ...forwarded
    },
    forwardedRef,
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
    // The child's own className and every other prop are kept by cloneElement;
    // `triggerClassName` is joined in front of its className.
    const child = children as ReactElement<Record<string, unknown>>;
    const childProps = child.props;
    const childRef = childProps.ref as Ref<HTMLElement> | undefined;
    const triggerRef = useMemo(
      () => composeRefs(childRef, forwardedRef as Ref<HTMLElement> | undefined, anchorRef),
      [childRef, forwardedRef],
    );
    const chain =
      (own: unknown, ours: () => void) =>
      (event: unknown) => {
        if (typeof own === "function") own(event);
        ours();
      };

    /*
     * Props the Tooltip does not use go to its child, so it composes inside a
     * trigger: `Dropdown.Trigger` / `Popover.Trigger` merge their onClick,
     * onKeyDown, popup ARIA and handle onto THEIR child, which is this Tooltip,
     * and before this the Tooltip dropped them all. The child's own value wins
     * on a clash (the asChild rule), except handlers, where both run: the
     * child's first, then the forwarded one.
     */
    const merged: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(forwarded)) {
      const own = childProps[key];
      if (/^on[A-Z]/.test(key) && typeof value === "function" && typeof own === "function") {
        merged[key] = (...args: unknown[]) => {
          (own as (...a: unknown[]) => void)(...args);
          (value as (...a: unknown[]) => void)(...args);
        };
      } else if (own === undefined) {
        merged[key] = value;
      }
    }
    const handler = (name: string) => merged[name] ?? childProps[name];
    // While the tooltip is shown the trigger is described by it, added to any
    // description the child already names. Not before: the id only exists in
    // the DOM while the tooltip does.
    const ownDescribedBy =
      [childProps["aria-describedby"], forwarded["aria-describedby"]]
        .filter((v): v is string => typeof v === "string" && v !== "")
        .join(" ") || undefined;
    const describedBy = open && describe
      ? [ownDescribedBy, tooltipId].filter(Boolean).join(" ")
      : ownDescribedBy;
    const trigger = cloneElement(child, {
      ...merged,
      ...(triggerClassName
        ? { className: cn(triggerClassName, childProps.className as string | undefined) }
        : {}),
      ref: triggerRef,
      "aria-describedby": describedBy,
      onMouseEnter: chain(handler("onMouseEnter"), show),
      onMouseLeave: chain(handler("onMouseLeave"), hide),
      onFocus: chain(handler("onFocus"), show),
      onBlur: chain(handler("onBlur"), hide),
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

// Tooltip's `className` styles the bubble, so `Popover.Trigger` /
// `Dropdown.Trigger` route their `className` to `triggerClassName`, which
// reaches the element the Tooltip wraps.
(Tooltip as unknown as Record<symbol, unknown>)[TRIGGER_CLASS_NAME_PROP] = "triggerClassName";

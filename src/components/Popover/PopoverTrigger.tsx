import { isValidElement, useMemo, type KeyboardEvent, type ReactElement } from "react";
import { cn } from "../../utils/cn";
import {
  classifyTriggerChild,
  cloneTriggerChild,
  composeRefs,
  popupTriggerAria,
  triggerChildRef,
  type TriggerChild,
} from "../../utils/trigger-child";
import { usePopover } from "./Popover.context";
import type { PopoverTriggerProps } from "./Popover.types";

/**
 * The popover's anchor. Its ARIA (`aria-haspopup`, from the Popover's
 * `haspopup` prop and `"dialog"` by default, `aria-expanded`,
 * `aria-controls`) and the `data-react-fancy-popover-trigger` handle go on the
 * focusable child itself, merged with the props it already has. A child
 * nothing can focus is wrapped in a `<button>` that carries them instead.
 *
 * In `hover` mode the popover opens on pointer hover and activation does
 * nothing, so the trigger claims no popup ARIA at all: announcing "has popup"
 * on something Enter does not open would be a lie. A child that is not an
 * element (plain text) is wrapped in a `<span>` there, with no ARIA on it.
 */
export function PopoverTrigger({ children, className, ...rest }: PopoverTriggerProps) {
  const { setOpen, open, anchorRef, hover, onHoverEnter, onHoverLeave, contentId, haspopup } = usePopover();

  const classified = classifyTriggerChild(children);
  // Hover mode leaves a non-focusable element as it is: it is a preview, and
  // has no activation for a button to offer.
  const target: TriggerChild =
    hover && classified.mode === "wrap" && isValidElement(children) && typeof children.type === "string"
      ? { mode: "clone", element: children as ReactElement<Record<string, unknown>>, aria: false }
      : classified;
  const childRef = triggerChildRef(target);
  const ref = useMemo(() => composeRefs(childRef, anchorRef), [childRef, anchorRef]);

  const toggle = () => setOpen(!open);
  const handlers = hover
    ? { onMouseEnter: onHoverEnter, onMouseLeave: onHoverLeave }
    : { onClick: toggle };

  const aria = hover ? {} : popupTriggerAria(haspopup, open, contentId);

  if (target.mode === "clone") {
    // A focusable host element given role="button" here (a `<span tabIndex>`)
    // does not activate on Enter / Space by itself, so the trigger does it.
    const onKeyDown =
      !hover && target.role === "button"
        ? (e: KeyboardEvent<HTMLElement>) => {
            if (e.defaultPrevented || (e.key !== "Enter" && e.key !== " ")) return;
            e.preventDefault();
            toggle();
          }
        : undefined;

    return cloneTriggerChild(target.element, {
      owned: {
        "data-react-fancy-popover-trigger": "",
        ...handlers,
        ...(onKeyDown ? { onKeyDown } : {}),
        ...(target.role && !hover ? { role: target.role } : {}),
        ...(target.aria ? aria : {}),
      },
      fallback: { ...rest, className },
      ref,
    });
  }

  if (hover) {
    return (
      <span
        {...rest}
        ref={ref as React.Ref<HTMLSpanElement>}
        data-react-fancy-popover-trigger=""
        className={cn("inline-flex", className)}
        {...handlers}
      >
        {children}
      </span>
    );
  }

  return (
    <button
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      data-react-fancy-popover-trigger=""
      className={cn("inline-flex", className)}
      {...handlers}
      {...aria}
    >
      {children}
    </button>
  );
}

PopoverTrigger.displayName = "PopoverTrigger";

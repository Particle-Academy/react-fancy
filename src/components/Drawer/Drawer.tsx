import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { DrawerContext } from "./Drawer.context";
import { DrawerHeader } from "./DrawerHeader";
import { DrawerBody } from "./DrawerBody";
import { DrawerFooter } from "./DrawerFooter";
import { DrawerContainer } from "./DrawerContainer";
import { useFocusTrap } from "../../hooks/use-focus-trap";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useAnimation } from "../../hooks/use-animation";
import type { DrawerProps, DrawerSide } from "./Drawer.types";

/**
 * `size` addresses the drawer's own axis: width on the horizontal edges,
 * height on the vertical ones. Keeping one scale across both means `size="lg"`
 * does not have to be re-learned when a drawer moves from the side to the
 * bottom.
 */
const WIDTH = {
  sm: "w-64",
  md: "w-80",
  lg: "w-96",
  xl: "w-[32rem]",
  full: "w-full",
} as const;

const HEIGHT = {
  sm: "h-32",
  md: "h-64",
  lg: "h-96",
  xl: "h-[32rem]",
  full: "h-full",
} as const;

const ANCHOR: Record<DrawerSide, string> = {
  left: "inset-y-0 left-0",
  right: "inset-y-0 right-0",
  top: "inset-x-0 top-0",
  bottom: "inset-x-0 bottom-0",
};

const ENTER: Record<DrawerSide, string> = {
  left: "fancy-slide-in-left",
  right: "fancy-slide-in-right",
  top: "fancy-slide-in-top",
  bottom: "fancy-slide-in-bottom",
};

const EXIT: Record<DrawerSide, string> = {
  left: "fancy-slide-out-left",
  right: "fancy-slide-out-right",
  top: "fancy-slide-out-top",
  bottom: "fancy-slide-out-bottom",
};

/** The panel's edge shadow reads as depth away from the anchored edge. */
const EDGE: Record<DrawerSide, string> = {
  left: "border-r",
  right: "border-l",
  top: "border-b",
  bottom: "border-t",
};

function DrawerRoot({
  children,
  open,
  onClose,
  side = "right",
  size = "md",
  attach = "viewport",
  backdrop = true,
  dismissOnBackdrop = true,
  dismissOnEscape = true,
  className,
  ...rest
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const horizontal = side === "left" || side === "right";
  const isViewport = attach === "viewport";

  const close = useCallback(() => onClose(), [onClose]);
  useEscapeKey(close, open && dismissOnEscape);

  // A container-attached drawer is a panel, not a dialog — trapping focus in it
  // would strand keyboard users inside a Card. Only the viewport form is modal.
  useFocusTrap(panelRef, open && isViewport);

  useEffect(() => {
    if (!open || !isViewport) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open, isViewport]);

  const { mounted, className: animClass, ref: animRef } = useAnimation({
    open,
    enterClass: ENTER[side],
    exitClass: EXIT[side],
  });

  const ctx = useMemo(() => ({ open, close, side }), [open, close, side]);

  if (!mounted) return null;

  const frame = (
    <div
      data-react-fancy-drawer-frame=""
      className={cn(isViewport ? "fixed inset-0 z-50" : "absolute inset-0 z-20", !backdrop && "pointer-events-none")}
    >
      {backdrop ? (
        <div
          data-react-fancy-drawer-backdrop=""
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity",
            isViewport && "backdrop-blur-sm",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={dismissOnBackdrop ? close : undefined}
          aria-hidden="true"
        />
      ) : null}

      <div
        ref={(node) => {
          panelRef.current = node;
          (animRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }}
        data-react-fancy-drawer=""
        data-side={side}
        role="dialog"
        aria-modal={isViewport || undefined}
        {...rest}
        className={cn(
          "pointer-events-auto absolute flex flex-col border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900",
          ANCHOR[side],
          EDGE[side],
          horizontal ? WIDTH[size] : HEIGHT[size],
          // Cross-axis fills the anchor; the main axis is capped so a viewport
          // drawer can never grow past the screen on a small device.
          horizontal ? "h-full" : "w-full",
          isViewport && (horizontal ? "max-w-[90vw]" : "max-h-[90vh]"),
          !isViewport && (horizontal ? "max-w-full" : "max-h-full"),
          animClass,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );

  return (
    <DrawerContext.Provider value={ctx}>
      {isViewport ? <Portal>{frame}</Portal> : frame}
    </DrawerContext.Provider>
  );
}

export const Drawer = Object.assign(DrawerRoot, {
  Header: DrawerHeader,
  Body: DrawerBody,
  Footer: DrawerFooter,
  Container: DrawerContainer,
});

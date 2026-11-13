import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { DrawerContext } from "./Drawer.context";
import { DrawerHeader } from "./DrawerHeader";
import { DrawerBody } from "./DrawerBody";
import { DrawerFooter } from "./DrawerFooter";
import { DrawerContainer } from "./DrawerContainer";
import { useDialogFocusTrap } from "../../hooks/use-dialog-focus-trap";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useAnimation } from "../../hooks/use-animation";
import { useInertOutside } from "../../hooks/use-inert-outside";
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
  start: "inset-y-0 start-0",
  end: "inset-y-0 end-0",
  left: "inset-y-0 left-0",
  right: "inset-y-0 right-0",
  top: "inset-x-0 top-0",
  bottom: "inset-x-0 bottom-0",
};

const ENTER: Record<DrawerSide, string> = {
  start: "fancy-slide-in-start",
  end: "fancy-slide-in-end",
  left: "fancy-slide-in-left",
  right: "fancy-slide-in-right",
  top: "fancy-slide-in-top",
  bottom: "fancy-slide-in-bottom",
};

const EXIT: Record<DrawerSide, string> = {
  start: "fancy-slide-out-start",
  end: "fancy-slide-out-end",
  left: "fancy-slide-out-left",
  right: "fancy-slide-out-right",
  top: "fancy-slide-out-top",
  bottom: "fancy-slide-out-bottom",
};

/** The panel's edge shadow reads as depth away from the anchored edge. */
const EDGE: Record<DrawerSide, string> = {
  start: "border-e",
  end: "border-s",
  left: "border-r",
  right: "border-l",
  top: "border-b",
  bottom: "border-t",
};

function DrawerRoot({
  children,
  open,
  onClose,
  side = "end",
  size = "md",
  attach = "viewport",
  backdrop = true,
  dismissOnBackdrop = true,
  dismissOnEscape = true,
  keepMounted = false,
  className,
  ...rest
}: DrawerProps) {
  const horizontal = side !== "top" && side !== "bottom";
  const isViewport = attach === "viewport";

  const close = useCallback(() => onClose(), [onClose]);
  useEscapeKey(close, open && dismissOnEscape);

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

  // A container-attached drawer is a panel, not a dialog — trapping focus in it
  // would strand keyboard users inside a Card. Only the viewport form is modal.
  // The panel mounts renders after `open` flips; see useDialogFocusTrap.
  const attachTrap = useDialogFocusTrap(open, isViewport);
  const attachPanel = useCallback(
    (node: HTMLDivElement | null) => {
      (animRef as React.MutableRefObject<HTMLElement | null>).current = node;
      attachTrap(node);
    },
    [animRef, attachTrap],
  );

  // Named by Drawer.Header's title unless the host names it; see Modal.
  const titleId = useId();
  const [hasTitle, setHasTitle] = useState(false);
  const registerTitle = useCallback(() => {
    setHasTitle(true);
    return () => setHasTitle(false);
  }, []);
  const hostNamed = rest["aria-label"] != null || rest["aria-labelledby"] != null;

  // A viewport drawer is modal: while open, everything outside its ancestor
  // chain is inert. A container-attached drawer is a panel and leaves the page alone.
  const [frameNode, setFrameNode] = useState<HTMLDivElement | null>(null);
  useInertOutside(frameNode, open && isViewport);

  const ctx = useMemo(
    () => ({ open, close, side, titleId, registerTitle }),
    [open, close, side, titleId, registerTitle],
  );

  if (!mounted && !keepMounted) return null;

  // keepMounted: once the exit has played, the frame stays in the tree but is
  // `hidden` (display: none, so not painted, no tab stops and no live-region
  // chatter), `inert` and `aria-hidden`. Plain attributes, so the server and
  // the client render the same markup.
  const concealed = keepMounted && !mounted;

  const frame = (
    <div
      ref={setFrameNode}
      data-react-fancy-drawer-frame=""
      hidden={concealed || undefined}
      inert={concealed || undefined}
      aria-hidden={concealed || undefined}
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
        ref={attachPanel}
        data-react-fancy-drawer=""
        data-side={side}
        role="dialog"
        aria-modal={isViewport || undefined}
        aria-labelledby={!hostNamed && hasTitle ? titleId : undefined}
        {...rest}
        className={cn(
          "pointer-events-auto absolute flex flex-col border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] shadow-xl dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
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

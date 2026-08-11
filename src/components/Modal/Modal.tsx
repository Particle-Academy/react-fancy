import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { ModalContext } from "./Modal.context";
import { ModalHeader } from "./ModalHeader";
import { ModalBody } from "./ModalBody";
import { ModalFooter } from "./ModalFooter";
import { useFocusTrap } from "../../hooks/use-focus-trap";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useAnimation } from "../../hooks/use-animation";
import type { ModalProps } from "./Modal.types";

/**
 * Every size is capped against the VIEWPORT, not just the width.
 *
 * Only `full` used to carry a max-height. The other four were width-constrained
 * and vertically unbounded, so a modal with long content simply grew past the
 * bottom of the screen and the rest became unreachable — no scrollbar, because
 * there was no overflow to scroll: the box got taller instead.
 *
 * `ModalBody` already had `flex-1 overflow-y-auto` and the panel already had
 * `overflow-hidden`. The scrolling machinery was complete and inert, waiting on
 * the one constraint that makes it engage.
 *
 * `dvh` over `vh` deliberately: on mobile browsers `100vh` is the tallest the
 * viewport ever gets, ignoring the address bar, so a `vh`-capped modal still
 * runs under the chrome on exactly the devices with least room. `dvh` tracks
 * the visible height. The `vh` fallback is listed first for any engine that
 * does not know `dvh` yet — an unknown unit drops the declaration, so ordering
 * is what keeps the old behaviour rather than none.
 */
const VIEWPORT_CAP = "max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)]";

const SIZE_MAP = {
  sm: `max-w-sm ${VIEWPORT_CAP}`,
  md: `max-w-lg ${VIEWPORT_CAP}`,
  lg: `max-w-2xl ${VIEWPORT_CAP}`,
  xl: `max-w-4xl ${VIEWPORT_CAP}`,
  full: `max-w-[calc(100vw-2rem)] ${VIEWPORT_CAP}`,
} as const;

function ModalRoot({
  children,
  open,
  onClose,
  size = "md",
  className,
  ...rest
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => onClose(), [onClose]);
  useEscapeKey(close, open);
  useFocusTrap(panelRef, open);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  const { mounted, className: animClass, ref: animRef } = useAnimation({
    open,
    enterClass: "fancy-slide-up",
    exitClass: "fancy-fade-out",
  });

  const ctx = useMemo(() => ({ open, close }), [open, close]);

  if (!mounted) return null;

  return (
    <ModalContext.Provider value={ctx}>
      <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            ref={(node) => {
              panelRef.current = node;
              (animRef as React.MutableRefObject<HTMLElement | null>).current =
                node;
            }}
            data-react-fancy-modal=""
            role="dialog"
            aria-modal="true"
            {...rest}
            className={cn(
              "relative flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900",
              SIZE_MAP[size],
              animClass,
              className,
            )}
          >
            {children}
          </div>
        </div>
      </Portal>
    </ModalContext.Provider>
  );
}

export const Modal = Object.assign(ModalRoot, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
});

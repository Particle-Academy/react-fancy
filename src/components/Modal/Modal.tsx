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

const SIZE_MAP = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
} as const;

function ModalRoot({
  children,
  open,
  onClose,
  size = "md",
  className,
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

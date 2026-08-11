import { cn } from "../../utils/cn";
import type { ModalBodyProps } from "./Modal.types";

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    // `min-h-0` is load-bearing, not decoration. A flex child defaults to
    // `min-height: auto`, which refuses to shrink below its content — so
    // `flex-1` alone would push the panel through its own max-height and the
    // scrollbar would never appear. This is what permits the overflow that
    // `overflow-y-auto` then handles.
    <div data-react-fancy-modal-body="" className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-4 text-zinc-700 dark:text-zinc-300", className)}>
      {children}
    </div>
  );
}

ModalBody.displayName = "ModalBody";

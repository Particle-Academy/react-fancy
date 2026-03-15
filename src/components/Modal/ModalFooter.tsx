import { cn } from "../../utils/cn";
import type { ModalFooterProps } from "./Modal.types";

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      data-react-fancy-modal-footer=""
      className={cn(
        "flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-700",
        className,
      )}
    >
      {children}
    </div>
  );
}

ModalFooter.displayName = "ModalFooter";

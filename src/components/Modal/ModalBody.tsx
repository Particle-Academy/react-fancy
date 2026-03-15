import { cn } from "../../utils/cn";
import type { ModalBodyProps } from "./Modal.types";

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div data-react-fancy-modal-body="" className={cn("flex-1 overflow-y-auto px-6 py-4", className)}>
      {children}
    </div>
  );
}

ModalBody.displayName = "ModalBody";

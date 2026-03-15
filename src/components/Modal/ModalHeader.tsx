import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useModal } from "./Modal.context";
import type { ModalHeaderProps } from "./Modal.types";

export function ModalHeader({ children, className }: ModalHeaderProps) {
  const { close } = useModal();

  return (
    <div
      data-react-fancy-modal-header=""
      className={cn(
        "flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700",
        className,
      )}
    >
      <div className="text-lg font-semibold">{children}</div>
      <button
        type="button"
        onClick={close}
        className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        aria-label="Close"
      >
        <X size={20} />
      </button>
    </div>
  );
}

ModalHeader.displayName = "ModalHeader";

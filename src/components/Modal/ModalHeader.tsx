import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useModal } from "./Modal.context";
import type { ModalHeaderProps } from "./Modal.types";

/**
 * The close button draws at 28px (20px icon + `p-1`) and HITS at 44px, the
 * WCAG 2.5.5 (AAA) target: a `::before` overhangs it by 8px on every side. A
 * pseudo-element is part of its button for hit-testing, so the look, the hover
 * fill and the header's height are all unchanged — the header's `py-4` already
 * has room for the overhang. A size option was the alternative; it would have
 * left every existing Modal at 28px unless someone opted in.
 */
export function ModalHeader({ children, className, closeLabel = "Close" }: ModalHeaderProps) {
  const { close } = useModal();

  return (
    <div
      data-react-fancy-modal-header=""
      className={cn(
        "flex items-center justify-between border-b border-[color:var(--fancy-border,var(--color-zinc-200))] px-6 py-4 dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]",
        className,
      )}
    >
      <div className="text-lg font-semibold text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]">{children}</div>
      <button
        type="button"
        onClick={close}
        data-react-fancy-modal-close=""
        className="relative rounded-lg p-1 text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))] before:absolute before:-inset-2 before:content-[''] transition-colors hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] hover:text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:hover:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))] dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]"
        aria-label={closeLabel}
      >
        <X size={20} />
      </button>
    </div>
  );
}

ModalHeader.displayName = "ModalHeader";

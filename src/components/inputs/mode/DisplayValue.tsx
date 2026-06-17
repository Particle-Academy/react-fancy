import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "../../../utils/cn";
import type { Size } from "../../../utils/types";
import { inputSizeClasses } from "../inputs.utils";

export interface DisplayValueProps {
  /** The formatted value to show. Empty / null / undefined renders `empty`. */
  children?: ReactNode;
  size?: Size;
  /** Static adornment rendered before the value (mirrors an input's `leading`/`prefix`). */
  leading?: ReactNode;
  /** Static adornment rendered after the value (mirrors an input's `trailing`/`suffix`). */
  trailing?: ReactNode;
  /** Shown when the value is empty. Default `—`. */
  empty?: ReactNode;
  /** When true the value is clickable to enter edit mode (inline click-to-edit). */
  interactive?: boolean;
  /** Called when an interactive value is activated (click / Enter / Space). */
  onActivate?: () => void;
  className?: string;
}

function isEmpty(value: ReactNode): boolean {
  return value === null || value === undefined || value === "";
}

/**
 * The read-only counterpart to an `<input>`. Renders a non-interactive value
 * with the same size rhythm as the editable control (reusing
 * {@link inputSizeClasses}) but without the border / background / focus ring.
 *
 * When `interactive` (inline click-to-edit), the value becomes a focusable,
 * hoverable target that calls `onActivate` on click / Enter / Space to swap in
 * the real control. Dropped into the SAME `Field` wrapper the editable control
 * uses, so label / description / error chrome stays byte-identical between the
 * display and the editor.
 *
 * Carries `data-react-fancy-display` / `data-mode="view"` stable handles for
 * agents and tests (Human+ contract).
 */
export function DisplayValue({
  children,
  size = "md",
  leading,
  trailing,
  empty = "—",
  interactive,
  onActivate,
  className,
}: DisplayValueProps) {
  const empties = isEmpty(children);

  const onKeyDown = interactive
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate?.();
        }
      }
    : undefined;

  return (
    <div
      data-react-fancy-display=""
      data-mode="view"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      title={interactive ? "Click to edit" : undefined}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={onKeyDown}
      className={cn(
        "flex w-full items-center gap-2 text-zinc-900 dark:text-zinc-100",
        inputSizeClasses[size],
        // Strip the editable box look — keep only the size/padding rhythm.
        "border-0 bg-transparent px-0",
        interactive &&
          "-mx-2 cursor-text rounded-md px-2 outline-none transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:bg-zinc-800",
        empties && "text-zinc-400 dark:text-zinc-500",
        className,
      )}
    >
      {leading && <span className="text-zinc-400 dark:text-zinc-500">{leading}</span>}
      <span className="min-w-0 truncate">{empties ? empty : children}</span>
      {trailing && <span className="text-zinc-400 dark:text-zinc-500">{trailing}</span>}
    </div>
  );
}

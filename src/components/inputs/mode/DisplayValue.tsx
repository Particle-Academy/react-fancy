import type { ReactNode } from "react";
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
  className?: string;
}

function isEmpty(value: ReactNode): boolean {
  return value === null || value === undefined || value === "";
}

/**
 * The read-only counterpart to an `<input>`. Renders a non-interactive value
 * with the same size rhythm as the editable control (reusing
 * {@link inputSizeClasses}) but without the border / background / focus ring —
 * view text should read as text, not a disabled box. Dropped into the SAME
 * `Field` wrapper the editable control uses, so label / description / error
 * chrome stays byte-identical between edit and view.
 *
 * Carries `data-react-fancy-display` / `data-mode="view"` stable handles so
 * agents and tests can locate rendered values (Human+ contract).
 */
export function DisplayValue({
  children,
  size = "md",
  leading,
  trailing,
  empty = "—",
  className,
}: DisplayValueProps) {
  const empties = isEmpty(children);
  return (
    <div
      data-react-fancy-display=""
      data-mode="view"
      className={cn(
        "flex w-full items-center gap-2 text-zinc-900 dark:text-zinc-100",
        inputSizeClasses[size],
        // Strip the editable box look — keep only the size/padding rhythm.
        "border-0 bg-transparent px-0",
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

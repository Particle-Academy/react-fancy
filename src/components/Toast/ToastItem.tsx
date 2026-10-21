import { useEffect } from "react";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";
import { cn } from "../../utils/cn";
import type { ToastItemProps } from "./Toast.types";

const VARIANT_STYLES = {
  default:
    "border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
  success:
    "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950",
  error:
    "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
  warning:
    "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
  info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
} as const;

const VARIANT_ICON_COLORS = {
  default: "text-zinc-400",
  success: "text-emerald-500",
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
} as const;

export function ToastItem({ data, onDismiss }: ToastItemProps) {
  const { id, title, description, variant = "default", action } = data;
  // An action toast does not expire by default.
  const duration = data.duration ?? (action ? 0 : 5000);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      data-react-fancy-toast-item=""
      role="alert"
      // Scoped to the toast rather than the document: a global Escape handler
      // would fight whatever modal or drawer is already listening.
      onKeyDown={(e) => {
        if (e.key === "Escape") onDismiss(id);
      }}
      className={cn(
        "fancy-toast-in pointer-events-auto w-80 rounded-xl border p-4 shadow-lg",
        VARIANT_STYLES[variant],
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", VARIANT_ICON_COLORS[variant])}>
          {variant === "success" && <Check size={16} />}
          {variant === "error" && <XCircle size={16} />}
          {variant === "warning" && <AlertTriangle size={16} />}
          {variant === "info" && <Info size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]">{title}</p>
          {description && (
            <p className="mt-1 text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
              {description}
            </p>
          )}
        </div>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              // The offer is consumed; leaving it up invites undoing an
              // already-undone action.
              onDismiss(id);
            }}
            className="shrink-0 self-center rounded-md px-2 py-1 text-xs font-medium text-zinc-700 underline-offset-2 transition-colors hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] hover:underline dark:text-zinc-200 dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]"
          >
            {action.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="shrink-0 rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

ToastItem.displayName = "ToastItem";

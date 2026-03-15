import { useEffect } from "react";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";
import { cn } from "../../utils/cn";
import type { ToastItemProps } from "./Toast.types";

const VARIANT_STYLES = {
  default:
    "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
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
  const { id, title, description, variant = "default", duration = 5000 } = data;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      data-react-fancy-toast-item=""
      role="alert"
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
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
          {description && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
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

import { cn } from "../../../utils/cn";
import { labelSizeClasses } from "../inputs.utils";
import type { FieldProps } from "./Field.types";

export function Field({
  label,
  description,
  error,
  required,
  htmlFor,
  size = "md",
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className={cn(
            "font-medium text-zinc-700 dark:text-zinc-300",
            labelSizeClasses[size],
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {description && !error && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

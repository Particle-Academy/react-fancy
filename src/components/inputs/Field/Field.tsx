import { cn } from "../../../utils/cn";
import { labelSizeClasses } from "../inputs.utils";
import type { FieldProps } from "./Field.types";

export function Field({
  label,
  labelHidden,
  labelId,
  description,
  error,
  required,
  htmlFor,
  size = "md",
  children,
  className,
  ...rest
}: FieldProps) {
  return (
    <div {...rest} data-react-fancy-field="" className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          id={labelId}
          className={cn(
            "font-medium text-zinc-700 dark:text-zinc-100",
            labelSizeClasses[size],
            // Out of the layout, still in the accessibility tree.
            labelHidden && "sr-only",
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

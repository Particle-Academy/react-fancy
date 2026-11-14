import { cn } from "../../../utils/cn";
import { ERROR_TEXT, labelSizeClasses } from "../inputs.utils";
import type { FieldProps } from "./Field.types";

export function Field({
  label,
  labelHidden,
  labelId,
  description,
  descriptionId,
  error,
  errorId,
  required,
  htmlFor,
  size = "md",
  children,
  className,
  ...rest
}: FieldProps) {
  // Derived from the control's id when the caller passes none, so a `<Field>`
  // composed by hand still gets a message the control can point at.
  const resolvedErrorId = errorId ?? (htmlFor ? `${htmlFor}-error` : undefined);
  const resolvedDescriptionId = descriptionId ?? (htmlFor ? `${htmlFor}-description` : undefined);
  return (
    <div {...rest} data-react-fancy-field="" className={cn("relative flex flex-col gap-2", className)}>
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
          {required && <span className={cn("ms-0.5", ERROR_TEXT)}>*</span>}
        </label>
      )}
      {children}
      {description && !error && (
        <p id={resolvedDescriptionId} className="text-xs text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]">
          {description}
        </p>
      )}
      {error && (
        // `role="alert"`: announced when it appears, which is when a submit
        // fails. Mounted with its text, as an alert is announced on insertion.
        <p id={resolvedErrorId} role="alert" data-react-fancy-field-error="" className={cn("text-xs", ERROR_TEXT)}>
          {error}
        </p>
      )}
    </div>
  );
}

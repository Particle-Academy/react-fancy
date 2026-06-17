import { useMemo, type FormHTMLAttributes, type ReactNode } from "react";
import type { FieldMode } from "../inputs.types";
import { FieldModeContext } from "./FieldMode.context";

export interface FormProviderProps {
  /** `"edit"` (default) or `"view"` — applied to every input below that doesn't override it. */
  mode?: FieldMode;
  children?: ReactNode;
}

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  /** `"edit"` (default) or `"view"` — applied to every input inside. */
  mode?: FieldMode;
}

/**
 * Provide a form-wide {@link FieldMode} to every Fancy input below — flip a
 * whole form from editable to read-only display in one place. Pure context, no
 * DOM (use it to wrap a filter bar or any tree that isn't a `<form>`).
 */
export function FormProvider({ mode = "edit", children }: FormProviderProps) {
  const value = useMemo(() => ({ mode }), [mode]);
  return <FieldModeContext.Provider value={value}>{children}</FieldModeContext.Provider>;
}

/**
 * A real `<form>` that also broadcasts a form-wide {@link FieldMode} to the
 * inputs inside it (sugar over {@link FormProvider}). Per-input `mode` props
 * still override this.
 */
export function Form({ mode, children, ...formProps }: FormProps) {
  return (
    <FormProvider mode={mode}>
      <form data-react-fancy-form="" {...formProps}>
        {children}
      </form>
    </FormProvider>
  );
}

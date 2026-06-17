import { createContext, useContext } from "react";
import type { FieldMode } from "../inputs.types";

export interface FieldModeContextValue {
  mode: FieldMode;
}

export const FieldModeContext = createContext<FieldModeContextValue | null>(null);

/**
 * Resolve the effective mode for an input. Precedence: an explicit prop wins,
 * then the nearest `<Form>` / `<FormProvider>` context, then `"edit"`.
 *
 * Deliberately tolerant (returns `"edit"` outside any provider) — unlike a slot
 * guard — so every input works standalone with zero context and existing call
 * sites behave identically.
 */
export function useFieldMode(explicit?: FieldMode): FieldMode {
  const ctx = useContext(FieldModeContext);
  return explicit ?? ctx?.mode ?? "edit";
}

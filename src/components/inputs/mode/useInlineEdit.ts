import { useCallback, useState } from "react";
import type { FieldMode } from "../inputs.types";

export interface InlineEdit {
  /** Render the editable control (`true`) vs. the read-only value display (`false`). */
  showControl: boolean;
  /** Whether view mode is interactive (click-to-edit) — i.e. `view` and not disabled. */
  interactive: boolean;
  /** Enter edit mode (no-op unless interactive). */
  enterEdit: () => void;
  /** Leave edit mode, back to the value display. */
  exitEdit: () => void;
}

/**
 * Inline click-to-edit for `mode="view"`. The bound value shows as clean static
 * text; clicking it swaps in the focused control; blur returns to the display
 * (the control's `onChange` / `onBlur` fire as usual, so a host can persist on
 * commit). `mode="edit"` is always the control; a **disabled** view stays static
 * text (no click-to-edit).
 *
 * This is the value of "view mode": tidy read-only surfaces where each field
 * becomes editable only when the user reaches for it.
 */
export function useInlineEdit(mode: FieldMode, disabled?: boolean): InlineEdit {
  const [editing, setEditing] = useState(false);
  const interactive = mode === "view" && !disabled;
  const showControl = mode !== "view" || (interactive && editing);
  const enterEdit = useCallback(() => {
    if (interactive) setEditing(true);
  }, [interactive]);
  const exitEdit = useCallback(() => setEditing(false), []);
  return { showControl, interactive, enterEdit, exitEdit };
}

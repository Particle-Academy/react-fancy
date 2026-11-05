import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useFocusTrap } from "./use-focus-trap";

/**
 * The focus trap for a dialog whose panel mounts LATER than `open` flips —
 * Modal, Drawer and Command, all of which render through `useAnimation` (the
 * panel mounts a render after `open`) and `Portal` (its children a render after
 * that). Returns a callback ref for the panel.
 *
 * Up to 6.10.0 these called `useFocusTrap(ref, open)` directly. Its effect ran in
 * the commit where `open` flipped, found `ref.current === null`, returned, and
 * never ran again because its deps had not changed — so focus never moved in,
 * Tab walked out of the dialog, and close restored nothing. Keying the trap on
 * the panel NODE makes it run in the commit the panel actually appears, with or
 * without an animation.
 *
 * The opener is captured when `open` flips, before the panel exists. Captured at
 * trap time instead it would be whatever the panel autofocused (Command's
 * input), and close would "restore" focus into the dialog that is going away.
 */
export function useDialogFocusTrap(
  open: boolean,
  enabled: boolean = true,
): (node: HTMLElement | null) => void {
  const ref = useRef<HTMLElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [node, setNode] = useState<HTMLElement | null>(null);
  const active = open && enabled;

  useLayoutEffect(() => {
    if (active) opener.current = document.activeElement as HTMLElement | null;
  }, [active]);

  useFocusTrap(ref, active && node !== null, opener);

  return useCallback((el: HTMLElement | null) => {
    ref.current = el;
    setNode(el);
  }, []);
}

import type { RefObject } from "react";
import type { InputTagAdapter } from "./InputTag";

/**
 * Built-in DOM adapters. Each one wraps a familiar input element and
 * exposes the {@link InputTagAdapter} contract so `<InputTag>` can
 * attach to it. For non-DOM surfaces (code editor, sheet cell editor,
 * whiteboard sticky note), write your own — the contract is small.
 */

/**
 * Get React's monkey-patched-aside native value setter on a DOM
 * element. Required when programmatically updating `value` on a
 * controlled input: React's intercepted setter would otherwise swallow
 * the change and the consumer's `onChange` would never fire.
 */
function nativeValueSetter(el: HTMLInputElement | HTMLTextAreaElement): ((v: string) => void) | null {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  if (!desc?.set) return null;
  return desc.set.bind(el);
}

function replaceInValueElement(
  el: HTMLInputElement | HTMLTextAreaElement,
  start: number,
  end: number,
  replacement: string,
): void {
  const current = el.value;
  const next = current.slice(0, start) + replacement + current.slice(end);
  const setter = nativeValueSetter(el);
  if (setter) {
    setter(next);
  } else {
    el.value = next;
  }
  // Dispatch a native `input` event so any controlled-component
  // onChange handler upstream gets the new value.
  el.dispatchEvent(new Event("input", { bubbles: true }));
  // Place caret at the end of the inserted text.
  const caret = start + replacement.length;
  el.setSelectionRange(caret, caret);
  el.focus();
}

function valueElementAdapter(
  ref: RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
): InputTagAdapter {
  return {
    subscribe(fn) {
      const handler = () => {
        const el = ref.current;
        if (!el) return;
        fn({
          text: el.value,
          caretIndex: el.selectionStart ?? el.value.length,
        });
      };
      const el = ref.current;
      if (el) {
        el.addEventListener("input", handler);
        el.addEventListener("click", handler);
        el.addEventListener("keyup", handler);
        el.addEventListener("focus", handler);
      }
      return () => {
        const el2 = ref.current;
        if (el2) {
          el2.removeEventListener("input", handler);
          el2.removeEventListener("click", handler);
          el2.removeEventListener("keyup", handler);
          el2.removeEventListener("focus", handler);
        }
      };
    },
    replaceRange(start, end, replacement) {
      const el = ref.current;
      if (!el) return;
      replaceInValueElement(el, start, end, replacement);
    },
    getAnchorRect() {
      const el = ref.current;
      return el ? el.getBoundingClientRect() : null;
    },
    onKey(handler) {
      const fn = (e: KeyboardEvent) => {
        if (handler(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      const el = ref.current;
      if (el) el.addEventListener("keydown", fn);
      return () => {
        const el2 = ref.current;
        if (el2) el2.removeEventListener("keydown", fn);
      };
    },
  };
}

/**
 * Adapter for a DOM `<textarea>`. Works whether the consumer manages
 * `value` via React state (controlled) or lets the DOM hold it
 * (uncontrolled) — `replaceRange` uses React's native value setter and
 * dispatches a native `input` event so the upstream onChange fires.
 */
export function textareaAdapter(
  ref: RefObject<HTMLTextAreaElement | null>,
): InputTagAdapter {
  return valueElementAdapter(ref);
}

/** Adapter for a DOM `<input type="text|search|...">`. */
export function inputAdapter(
  ref: RefObject<HTMLInputElement | null>,
): InputTagAdapter {
  return valueElementAdapter(ref);
}

/**
 * Adapter for any `contenteditable` element. Operates on the element's
 * `textContent`; rich-text editors with their own internal model should
 * write a custom adapter that talks to that model instead.
 */
export function contentEditableAdapter(
  ref: RefObject<HTMLElement | null>,
): InputTagAdapter {
  function caretIndex(el: HTMLElement): number {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 0;
    const range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(sel.focusNode!, sel.focusOffset);
    return range.toString().length;
  }
  function setCaret(el: HTMLElement, index: number): void {
    const sel = window.getSelection();
    if (!sel) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let remaining = index;
    let node: Node | null = walker.nextNode();
    while (node) {
      const len = (node.textContent ?? "").length;
      if (remaining <= len) {
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      remaining -= len;
      node = walker.nextNode();
    }
    // Past end: place at end.
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  return {
    subscribe(fn) {
      const handler = () => {
        const el = ref.current;
        if (!el) return;
        fn({ text: el.textContent ?? "", caretIndex: caretIndex(el) });
      };
      const el = ref.current;
      if (el) {
        el.addEventListener("input", handler);
        el.addEventListener("click", handler);
        el.addEventListener("keyup", handler);
        el.addEventListener("focus", handler);
      }
      return () => {
        const el2 = ref.current;
        if (el2) {
          el2.removeEventListener("input", handler);
          el2.removeEventListener("click", handler);
          el2.removeEventListener("keyup", handler);
          el2.removeEventListener("focus", handler);
        }
      };
    },
    replaceRange(start, end, replacement) {
      const el = ref.current;
      if (!el) return;
      const current = el.textContent ?? "";
      const next = current.slice(0, start) + replacement + current.slice(end);
      el.textContent = next;
      setCaret(el, start + replacement.length);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.focus();
    },
    getAnchorRect() {
      const el = ref.current;
      return el ? el.getBoundingClientRect() : null;
    },
    onKey(handler) {
      const fn = (e: KeyboardEvent) => {
        if (handler(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      const el = ref.current;
      if (el) el.addEventListener("keydown", fn);
      return () => {
        const el2 = ref.current;
        if (el2) el2.removeEventListener("keydown", fn);
      };
    },
  };
}

/**
 * Adapter for hosts that fully control the text state themselves. Use
 * this when you can't (or don't want to) let the DOM be the source of
 * truth — for code editors with internal state, sheet cell editors, or
 * any host that already has `value` + `onChange` and wants to reach the
 * picker programmatically.
 *
 * The host calls `notify({ text, caretIndex })` after every text or
 * caret change. `<InputTag>` calls `onReplaceRange` to write back.
 */
export type ControlledAdapterHandle = InputTagAdapter & {
  /** Push the latest text + caret to the picker. */
  notify: (state: { text: string; caretIndex: number }) => void;
};

export function controlledAdapter(opts: {
  /** Element used as anchor + key target. Usually the visible input. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Called when the picker writes back an insertion. */
  onReplaceRange: (start: number, end: number, replacement: string) => void;
}): ControlledAdapterHandle {
  let listener: ((s: { text: string; caretIndex: number }) => void) | null = null;
  let keyHandler: ((e: KeyboardEvent) => boolean) | null = null;

  const installKey = () => {
    const el = opts.anchorRef.current;
    if (!el || !keyHandler) return () => {};
    const fn = (e: KeyboardEvent) => {
      if (keyHandler && keyHandler(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener("keydown", fn);
    return () => el.removeEventListener("keydown", fn);
  };

  return {
    notify(state) {
      listener?.(state);
    },
    subscribe(fn) {
      listener = fn;
      return () => {
        if (listener === fn) listener = null;
      };
    },
    replaceRange(start, end, replacement) {
      opts.onReplaceRange(start, end, replacement);
    },
    getAnchorRect() {
      const el = opts.anchorRef.current;
      return el ? el.getBoundingClientRect() : null;
    },
    onKey(handler) {
      keyHandler = handler;
      const uninstall = installKey();
      return () => {
        if (keyHandler === handler) keyHandler = null;
        uninstall();
      };
    },
  };
}

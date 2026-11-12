import {
  APPLE_KEY_NAMES,
  DEFAULT_KEY_NAMES,
  eventKey,
  hotkeyCaps,
  parseHotkey,
  type HotkeyCombo,
} from "../HotkeyCapture/hotkey";
import type { FancyPlatform } from "../../utils/platform";

/**
 * A submit key resolved from `PromptInput`'s `submitKey`: a HotkeyCapture
 * combination plus `mod`, the platform modifier (Command on Apple, Ctrl
 * elsewhere; either one presses it, as `"mod+enter"` always allowed).
 */
export interface SubmitCombo extends HotkeyCombo {
  mod: boolean;
}

/** Parse `"mod+enter"`, `"enter"` or any HotkeyCapture string. `null` when it names no key. */
export function parseSubmitKey(value: string): SubmitCombo | null {
  const raw = value.trim().toLowerCase();
  // `+` itself can be the key: "ctrl++" is ctrl and plus.
  const parts = raw.endsWith("++") ? [...raw.slice(0, -2).split("+"), "+"] : raw.split("+");
  const mod = parts.some((p) => p.trim() === "mod");
  const combo = parseHotkey(parts.filter((p) => p.trim() !== "mod").join("+"));
  return combo ? { ...combo, mod } : null;
}

type KeyEventLike = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">;

/**
 * Whether a keydown is the submit key.
 *
 * The two original values keep their original rules exactly: `"enter"` is Enter
 * without Shift, `"mod+enter"` is Enter with Ctrl or Command. Any other value
 * is matched exactly, modifier for modifier, so a recorded `ctrl+shift+enter`
 * does not also send on Ctrl+Enter.
 */
export function isSubmitKey(e: KeyEventLike, submitKey: string, combo: SubmitCombo | null): boolean {
  if (submitKey === "enter") return e.key === "Enter" && !e.shiftKey;
  if (submitKey === "mod+enter") return e.key === "Enter" && (e.metaKey || e.ctrlKey);
  if (!combo) return false;
  if (eventKey(e) !== combo.key) return false;
  if (e.shiftKey !== combo.shift || e.altKey !== combo.alt) return false;
  if (combo.mod) {
    if (!(e.ctrlKey || e.metaKey)) return false;
    return (!combo.ctrl || e.ctrlKey) && (!combo.meta || e.metaKey);
  }
  return e.ctrlKey === combo.ctrl && e.metaKey === combo.meta;
}

/** The combination as it is named: `mod` becomes Command on Apple, Ctrl elsewhere. */
function shown(combo: SubmitCombo, platform: FancyPlatform): HotkeyCombo {
  const apple = platform === "apple";
  return {
    key: combo.key,
    alt: combo.alt,
    shift: combo.shift,
    ctrl: combo.ctrl || (combo.mod && !apple),
    meta: combo.meta || (combo.mod && apple),
  };
}

/**
 * Key cap names for the submit key, in the kit's platform-aware spelling (the
 * same names HotkeyCapture shows), with the host's overrides on top.
 */
export function submitKeyCaps(
  combo: SubmitCombo | null,
  platform: FancyPlatform,
  overrides?: Partial<Record<string, string>>,
): string[] {
  if (!combo) return [];
  const names: Record<string, string> = {
    ...DEFAULT_KEY_NAMES,
    ...(platform === "apple" ? APPLE_KEY_NAMES : {}),
    ...(overrides as Record<string, string> | undefined),
  };
  return hotkeyCaps(shown(combo, platform), names);
}

const ARIA_KEYS: Record<string, string> = {
  enter: "Enter",
  space: "Space",
  tab: "Tab",
  escape: "Escape",
  backspace: "Backspace",
  delete: "Delete",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
};

function ariaKey(key: string): string {
  if (ARIA_KEYS[key]) return ARIA_KEYS[key];
  if (key.length === 1 || /^f\d{1,2}$/.test(key)) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * `aria-keyshortcuts` for the submit key. With `mod` both spellings are listed,
 * the platform's own first, since either key presses it.
 */
export function submitKeyShortcuts(combo: SubmitCombo | null, platform: FancyPlatform): string {
  if (!combo) return "";
  const spell = (c: HotkeyCombo) =>
    [
      c.ctrl && "Control",
      c.alt && "Alt",
      c.shift && "Shift",
      c.meta && "Meta",
      ariaKey(c.key),
    ]
      .filter(Boolean)
      .join("+");
  if (!combo.mod) return spell(combo);
  const asMeta = spell({ ...combo, meta: true });
  const asCtrl = spell({ ...combo, ctrl: true });
  return platform === "apple" ? `${asMeta} ${asCtrl}` : `${asCtrl} ${asMeta}`;
}

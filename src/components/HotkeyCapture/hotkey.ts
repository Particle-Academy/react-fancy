/**
 * The hotkey value: a normalised string such as `"ctrl+shift+k"`.
 *
 * Modifiers come first in a FIXED order (`ctrl`, `alt`, `shift`, `meta`), then
 * exactly one key, everything lower case. A string rather than an object
 * because the contract asks for JSON-friendly state: two equal shortcuts are
 * `===` equal, the value stores in a settings row as-is, and an agent can read
 * or write one without building anything. `parseHotkey` gives the object back
 * when a host wants to match a `KeyboardEvent` against it.
 *
 * The key is the PHYSICAL key for letters and digits (`KeyK` is `k`, `Digit1`
 * is `1`), so Shift+1 records as `shift+1` and not `!`, and macOS Option
 * combinations record the letter rather than the symbol Option types.
 */
export interface HotkeyCombo {
  /** The non-modifier key, lower case: `"k"`, `"1"`, `"f5"`, `"enter"`, `"space"`, `"arrowup"`. */
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

export const HOTKEY_MODIFIERS = ["ctrl", "alt", "shift", "meta"] as const;
export type HotkeyModifier = (typeof HOTKEY_MODIFIERS)[number];

const MODIFIER_ALIASES: Record<string, HotkeyModifier> = {
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  shift: "shift",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  super: "meta",
  win: "meta",
};

/** `KeyboardEvent.key` values that are modifiers on their own. */
const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "AltGraph", "Meta", "OS", "Super", "Hyper"]);

/** Format a combination as the normalised string. */
export function formatHotkey(combo: Partial<HotkeyCombo> | null | undefined): string {
  if (!combo || !combo.key) return "";
  const parts: string[] = HOTKEY_MODIFIERS.filter((m) => combo[m]);
  parts.push(combo.key.toLowerCase());
  return parts.join("+");
}

/**
 * Parse any `+`-joined spelling (`"Shift+Ctrl+K"`, `"cmd+k"`) into a
 * combination. `null` for an empty string or one with no non-modifier key.
 */
export function parseHotkey(value: string | null | undefined): HotkeyCombo | null {
  if (!value) return null;
  const combo: HotkeyCombo = { key: "", ctrl: false, alt: false, shift: false, meta: false };
  // `+` itself can be the key: "ctrl++" splits to ["ctrl", "", ""].
  const raw = value.trim().toLowerCase();
  const parts = raw.endsWith("++") ? [...raw.slice(0, -2).split("+"), "+"] : raw.split("+");
  for (const part of parts) {
    const p = part.trim();
    if (!p) continue;
    const mod = MODIFIER_ALIASES[p];
    if (mod) combo[mod] = true;
    else combo.key = p;
  }
  return combo.key ? combo : null;
}

/**
 * Key cap names every keyboard has. Shared by HotkeyCapture and PromptInput's
 * send hint, so a combination recorded in one is named the same in the other.
 */
export const DEFAULT_KEY_NAMES: Record<string, string> = {
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  meta: "Meta",
  space: "Space",
  enter: "Enter",
  escape: "Esc",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  arrowup: "Up",
  arrowdown: "Down",
  arrowleft: "Left",
  arrowright: "Right",
  pageup: "PgUp",
  pagedown: "PgDn",
  home: "Home",
  end: "End",
};

/** Apple keyboards: the true key names. `⌘` is the one high glyph, and Apple-only. */
export const APPLE_KEY_NAMES: Record<string, string> = { meta: "⌘", alt: "Option" };

/** The cap name of one normalised key, from `names` or derived from the key. */
export function hotkeyKeyName(key: string, names: Record<string, string>): string {
  if (names[key]) return names[key];
  if (key.length === 1) return key.toUpperCase();
  if (/^f\d{1,2}$/.test(key)) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Cap names for a combination, modifiers first in the fixed order. */
export function hotkeyCaps(combo: Partial<HotkeyCombo>, names: Record<string, string>): string[] {
  const caps: string[] = HOTKEY_MODIFIERS.filter((m) => combo[m]).map((m) => hotkeyKeyName(m, names));
  if (combo.key) caps.push(hotkeyKeyName(combo.key, names));
  return caps;
}

/** Whether a keydown is a modifier pressed on its own. */
export function isModifierOnly(event: Pick<KeyboardEvent, "key">): boolean {
  return MODIFIER_KEYS.has(event.key);
}

/** The key part of a keydown, normalised. Physical for letters and digits. */
export function eventKey(event: Pick<KeyboardEvent, "key" | "code">): string {
  const code = event.code ?? "";
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1].toLowerCase();
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code);
  if (digit) return digit[1];
  if (event.key === " " || code === "Space") return "space";
  if (event.key === "+") return "+";
  return event.key.toLowerCase();
}

/** The combination a keydown makes, or `null` when it is a modifier alone. */
export function comboFromEvent(
  event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">,
): HotkeyCombo | null {
  if (isModifierOnly(event)) return null;
  return {
    key: eventKey(event),
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };
}

/**
 * Which modifier key the user actually has.
 *
 * This exists because a keyboard hint is a CLAIM about the reader's hardware.
 * `⌘ + Enter to send` on Windows or Linux names a key that is not on the
 * keyboard, and a reader who cannot act on a hint learns to ignore hints — so
 * the cost is not one wrong glyph, it is the credibility of every hint beside
 * it. (Reported from a real Electron app running on Linux, where the glyph had
 * no font behind it either and rendered as tofu.)
 *
 * Two deliberate choices:
 *
 * 1. **The platform is an ARGUMENT, never a global read.** `detectPlatform`
 *    takes the hints; `modifierKeyLabel` takes the verdict. Both branches are
 *    therefore reachable from one machine, which is the only way a test can
 *    cover the platform you are not sitting at. A function that reads
 *    `navigator` internally can only ever be tested on the developer's own OS.
 * 2. **`generic` is the fallback, and that is not arbitrary.** Every Fancy
 *    surface that submits on a modifier accepts `metaKey || ctrlKey`, so
 *    `Ctrl` is a TRUE label on an Apple keyboard while `⌘` is a FALSE one
 *    everywhere else. The honest default is the one that is pressable on all
 *    of them.
 */
export type FancyPlatform = "apple" | "generic";

/**
 * The parts of `navigator` the detection reads — nothing more, so a caller can
 * hand it a literal (a test, an Electron main process forwarding `process.platform`,
 * a server with a stored preference).
 */
export interface PlatformHints {
  /** `navigator.userAgentData` — the modern, non-spoofed answer where it exists. */
  userAgentData?: { platform?: string } | null;
  /** `navigator.platform` — deprecated, still the most reliable legacy signal. */
  platform?: string | null;
  /** `navigator.userAgent` — last resort. */
  userAgent?: string | null;
}

/**
 * `userAgentData.platform` is a short enumerated token ("macOS", "Windows",
 * "Linux", "Android", "iOS"), so it is matched exactly rather than by substring.
 */
const APPLE_UA_DATA_PLATFORMS = new Set(["macos", "ios", "ipados"]);

/**
 * Legacy `platform` / `userAgent` are free text. iPadOS reports `MacIntel`, and
 * iOS user agents say "like Mac OS X" — both are Apple, so a Mac match is
 * correct for them too.
 */
const APPLE_FREE_TEXT = /\b(mac|macintosh|iphone|ipad|ipod|darwin)/i;

/** Resolve a platform from navigator-shaped hints. Unknown or absent ⇒ `generic`. */
export function detectPlatform(hints?: PlatformHints | null): FancyPlatform {
  if (!hints) return "generic";

  const uaData = hints.userAgentData?.platform;
  if (typeof uaData === "string" && uaData.length > 0) {
    // When the browser gives an enumerated answer, TRUST IT and stop. Falling
    // through to the free-text test would let a Windows UA string containing
    // the word "Mac" (a font name, a device model) overturn it.
    return APPLE_UA_DATA_PLATFORMS.has(uaData.trim().toLowerCase()) ? "apple" : "generic";
  }

  for (const value of [hints.platform, hints.userAgent]) {
    if (typeof value === "string" && APPLE_FREE_TEXT.test(value)) return "apple";
  }

  return "generic";
}

/**
 * The modifier key to NAME for a platform.
 *
 * `⌘` is emitted for `apple` and nothing else. A test enumerates the platform
 * values and counts that no other one can produce it, because a hint that names
 * the wrong key is worse than no hint.
 */
export function modifierKeyLabel(platform: FancyPlatform): "⌘" | "Ctrl" {
  return platform === "apple" ? "⌘" : "Ctrl";
}

/** SSR-safe read of the live browser hints. `null` off a browser. */
export function browserPlatformHints(): PlatformHints | null {
  if (typeof navigator === "undefined") return null;
  return navigator as PlatformHints;
}

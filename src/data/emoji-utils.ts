import { EMOJI_DATA, EMOJI_ENTRIES, type EmojiCategoryKey, type EmojiEntry } from "./emoji-data";

export const SKIN_TONES = ["light", "medium-light", "medium", "medium-dark", "dark"] as const;
export type SkinTone = typeof SKIN_TONES[number];

type IndexedEntry = EmojiEntry & { category: EmojiCategoryKey };

let byName: Map<string, IndexedEntry> | null = null;
let byChar: Map<string, IndexedEntry> | null = null;

function ensureIndexes() {
  if (byName && byChar) return;
  byName = new Map();
  byChar = new Map();
  for (const [category, group] of Object.entries(EMOJI_DATA) as [EmojiCategoryKey, typeof EMOJI_DATA[EmojiCategoryKey]][]) {
    for (const emoji of group.emojis) {
      const entry: IndexedEntry = { ...emoji, category };
      byName.set(emoji.name.toLowerCase(), entry);
      byChar.set(emoji.char, entry);
      if (emoji.skinTones) {
        for (const toned of emoji.skinTones) {
          byChar.set(toned, entry);
        }
      }
    }
  }
}

/** Resolve an emoji name to its character. */
export function resolve(name: string): string | undefined {
  ensureIndexes();
  return byName!.get(name.toLowerCase())?.char;
}

/** Search emojis by name substring. Returns matching base emoji characters. */
export function search(query: string): string[] {
  const lower = query.toLowerCase();
  return EMOJI_ENTRIES.filter((e) => e.name.includes(lower)).map((e) => e.char);
}

/** Find an emoji entry by its character (toned or base). */
export function find(char: string): IndexedEntry | undefined {
  ensureIndexes();
  return byChar!.get(char);
}

/** Return the 5-tone variant array for an emoji (by char, toned or base). */
export function skinTones(char: string): readonly [string, string, string, string, string] | undefined {
  return find(char)?.skinTones;
}

/** Whether an emoji supports skin tones. */
export function hasSkinTones(char: string): boolean {
  return !!find(char)?.skinTones;
}

/** Return the toned variant for an emoji, or the base if no tones. */
export function applyTone(char: string, tone: SkinTone | null): string {
  if (!tone) return char;
  const entry = find(char);
  if (!entry?.skinTones) return char;
  const idx = SKIN_TONES.indexOf(tone);
  return entry.skinTones[idx] ?? char;
}

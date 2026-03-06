import { EMOJI_ENTRIES } from "./emoji-data";

/** Resolve an emoji name to its character. */
export function resolve(name: string): string | undefined {
  const lower = name.toLowerCase();
  const entry = EMOJI_ENTRIES.find((e) => e.name === lower);
  return entry?.char;
}

/** Search emojis by name substring. Returns matching emoji characters. */
export function search(query: string): string[] {
  const lower = query.toLowerCase();
  return EMOJI_ENTRIES.filter((e) => e.name.includes(lower)).map((e) => e.char);
}

/** Find an emoji entry by its character. */
export function find(
  char: string,
): { char: string; name: string; category: string } | undefined {
  return EMOJI_ENTRIES.find((e) => e.char === char);
}

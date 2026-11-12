import { resolve } from "../../data/emoji-utils";
import type { ContentReactionItem, ContentReactionMode } from "./ContentReaction.types";

/**
 * The emoji are looked up by their Unicode name in the kit's emoji dataset
 * rather than written here. Component source carries no character outside the
 * Basic Multilingual Plane (tests/no-emoji-in-components.test.ts): the dataset
 * is the one place an emoji is the subject, and this set is drawn from it, the
 * same way `<Emoji name="thumbs up">` is.
 */
const named = (key: string, name: string, label: string): ContentReactionItem => ({
  key,
  emoji: resolve(name) ?? "",
  label,
});

/** The default reaction set, in display order. */
export const DEFAULT_CONTENT_REACTIONS: readonly ContentReactionItem[] = Object.freeze([
  named("strongly-agree", "hundred points", "Strongly agree"),
  named("like", "thumbs up", "Like"),
  named("love", "red heart", "Love"),
  named("insightful", "light bulb", "Insightful"),
  named("funny", "face with tears of joy", "Funny"),
  named("sad", "crying face", "Sad"),
  named("angry", "enraged face", "Angry"),
  named("dislike", "thumbs down", "Dislike"),
]);

/**
 * The value after choosing `key`, and whether it ended up on.
 *
 * `multi` adds or removes `key`, keeping the order of the others. `single`
 * replaces whatever was active with `key`, or clears it when `key` was the
 * active one. Exported so a host, or an agent bridge, applies the same rule.
 */
export function toggleReaction(
  value: readonly string[],
  key: string,
  mode: ContentReactionMode = "multi",
): { next: string[]; on: boolean } {
  const active = value.includes(key);
  if (mode === "single") return active ? { next: [], on: false } : { next: [key], on: true };
  return active ? { next: value.filter((k) => k !== key), on: false } : { next: [...value, key], on: true };
}

import type { SkinTone } from "../../data/emoji-utils";

export interface EmojiProps {
  name?: string;
  emoji?: string;
  tone?: SkinTone;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

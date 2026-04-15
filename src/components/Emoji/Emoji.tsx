import { cn } from "../../utils/cn";
import { applyTone, resolve } from "../../data/emoji-utils";
import type { EmojiProps } from "./Emoji.types";

export function Emoji({ name, emoji, tone, size = "md", className }: EmojiProps) {
  const base = emoji ?? (name ? resolve(name) : undefined);
  if (!base) return null;

  const resolved = tone ? applyTone(base, tone) : base;

  const sizeClass = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  }[size];

  return (
    <span
      role="img"
      aria-label={name ?? resolved}
      data-react-fancy-emoji=""
      className={cn("inline-block leading-none", sizeClass, className)}
    >
      {resolved}
    </span>
  );
}

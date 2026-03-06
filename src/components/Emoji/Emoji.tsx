import { cn } from "../../utils/cn";
import { resolve } from "../../data/emoji-utils";
import type { EmojiProps } from "./Emoji.types";

export function Emoji({ name, emoji, size = "md", className }: EmojiProps) {
  const resolved = emoji ?? (name ? resolve(name) : undefined);

  if (!resolved) return null;

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
      className={cn("inline-block leading-none", sizeClass, className)}
    >
      {resolved}
    </span>
  );
}

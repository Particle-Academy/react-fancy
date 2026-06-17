export interface AvatarProps {
  /** Image source URL */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Fallback initials when no image is provided */
  fallback?: string;
  /** Avatar size */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Online status indicator */
  status?: "online" | "offline" | "busy" | "away";
  /**
   * Pulsing halo ring around the avatar. `true` = neutral (violet) glow;
   * `"xp"` tints green, `"achievement"` tints amber. Pulse respects
   * `prefers-reduced-motion` (the steady ring stays, the pulse drops).
   */
  glow?: boolean | "xp" | "achievement";
  /** Additional CSS classes */
  className?: string;
}

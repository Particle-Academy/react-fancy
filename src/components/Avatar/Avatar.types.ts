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
  /** Additional CSS classes */
  className?: string;
}

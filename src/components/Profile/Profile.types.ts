export interface ProfileProps {
  src?: string;
  alt?: string;
  fallback?: string;
  name: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "busy" | "away";
  className?: string;
}

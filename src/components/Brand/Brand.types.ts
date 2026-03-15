import type { ReactNode } from "react";

export interface BrandProps {
  logo?: ReactNode;
  name?: string;
  tagline?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

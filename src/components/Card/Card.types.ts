import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "outlined" | "elevated" | "flat";
  padding?: "none" | "sm" | "md" | "lg";
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

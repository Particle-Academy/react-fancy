import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { SeedMarkProps } from "./SeedMark.types";

/**
 * SeedMark — vertical teardrop brand icon with gold/bronze gradient.
 * Used as the Aionima identity mark in top bars and loading screens.
 * Height is always 1.25× size to preserve the teardrop aspect ratio.
 */
export const SeedMark = forwardRef<HTMLSpanElement, SeedMarkProps>(
  ({ size = 30, className, style, ...props }, ref) => {
    const w = size;
    const h = Math.round(size * 1.25);
    return (
      <span
        ref={ref}
        data-react-fancy-seedmark=""
        aria-hidden="true"
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: w, height: h, ...style }}
        {...props}
      >
        <svg width={w} height={h} viewBox="0 0 32 40" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="rf-seed-grad" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" stopColor="#ecc878" />
              <stop offset="0.55" stopColor="#d39a36" />
              <stop offset="1" stopColor="#9a6a23" />
            </linearGradient>
          </defs>
          <path d="M16 1.5C24 11 24.5 29 16 38.5 7.5 29 8 11 16 1.5Z" fill="url(#rf-seed-grad)" />
          <path
            d="M16 8.5C19.3 16 19.3 24.5 16 31.5"
            stroke="#6f4d16"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M16 8.5C13 15 12.8 23 15 30"
            stroke="#f5dca0"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            opacity="0.45"
          />
        </svg>
      </span>
    );
  },
);

SeedMark.displayName = "SeedMark";

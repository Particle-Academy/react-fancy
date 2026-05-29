import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { OrbProps } from "./Orb.types";

type OrbColor = NonNullable<OrbProps["color"]>;

const innerColors: Record<OrbColor, string> = {
  violet: "#8b5cf6",
  amber: "#f59e0b",
  green: "#10b981",
  rose: "#f43f5e",
  blue: "#3b82f6",
  zinc: "#71717a",
};

const glowColors: Record<OrbColor, string> = {
  violet: "rgba(139,92,246,0.3)",
  amber: "rgba(245,158,11,0.3)",
  green: "rgba(16,185,129,0.3)",
  rose: "rgba(244,63,94,0.3)",
  blue: "rgba(59,130,246,0.3)",
  zinc: "rgba(113,113,122,0.25)",
};

/**
 * Orb — circular agent-presence indicator with optional slow-pulse animation.
 * Used in agent headers, chat panes, and context strips to signal Aion activity.
 * Import styles.css from react-fancy to enable the pulse animation.
 */
export const Orb = forwardRef<HTMLSpanElement, OrbProps>(
  ({ size = 26, pulse = false, color = "violet", className, style, title, ...props }, ref) => {
    const c = innerColors[color];
    const glow = glowColors[color];
    return (
      <span
        ref={ref}
        data-react-fancy-orb=""
        aria-label={title ?? "Agent active"}
        title={title ?? "Agent active"}
        className={cn(
          "inline-flex shrink-0 rounded-full",
          pulse && "fancy-orb-pulse",
          className,
        )}
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 35%, ${c}, color-mix(in srgb, ${c} 60%, #000))`,
          boxShadow: `0 0 0 ${Math.round(size * 0.08)}px ${glow}`,
          ...style,
        }}
        {...props}
      />
    );
  },
);

Orb.displayName = "Orb";

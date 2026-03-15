import type { ComponentType } from "react";

export interface IconSet {
  resolve: (name: string) => ComponentType<{ className?: string; size?: number }> | null;
}

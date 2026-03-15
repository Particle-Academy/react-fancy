import type { RenderExtension } from "./extensions";

export interface ContentRendererProps {
  value: string;
  format?: "html" | "markdown" | "auto";
  lineSpacing?: number;
  className?: string;
  /** Per-instance render extensions. Merged with any globally-registered extensions. */
  extensions?: RenderExtension[];
}

import type { RenderExtension } from "./extensions";

export interface ContentRendererProps {
  value: string;
  format?: "html" | "markdown" | "auto";
  lineSpacing?: number;
  className?: string;
  /** Per-instance render extensions. Merged with any globally-registered extensions. */
  extensions?: RenderExtension[];
  /**
   * Skip HTML sanitization. By default, rendered output is sanitized to remove
   * `<script>`, `<iframe>`, event handlers, and `javascript:` URIs. Pass
   * `unsafe` only when the input is fully trusted (e.g. server-rendered
   * markdown from your own CMS).
   * @default false
   */
  unsafe?: boolean;
}

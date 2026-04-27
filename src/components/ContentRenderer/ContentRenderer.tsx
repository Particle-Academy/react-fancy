import { useMemo } from "react";
import { marked } from "marked";
import { cn } from "../../utils/cn";
import { sanitizeHtml } from "../../utils/sanitize";
import { proseClasses, detectFormat } from "../Editor/editor.utils";
import { mergeExtensions } from "./extensions";
import { RenderedContent } from "./RenderedContent";
import type { ContentRendererProps } from "./ContentRenderer.types";

export function ContentRenderer({
  value,
  format = "auto",
  lineSpacing = 1.6,
  className,
  extensions: instanceExtensions,
  unsafe = false,
}: ContentRendererProps) {
  const extensions = useMemo(
    () => mergeExtensions(instanceExtensions),
    [instanceExtensions],
  );

  const html = useMemo(() => {
    const resolvedFormat = format === "auto" ? detectFormat(value) : format;
    const raw = resolvedFormat === "markdown"
      ? (marked.parse(value, { async: false }) as string)
      : value;
    return unsafe ? raw : sanitizeHtml(raw);
  }, [value, format, unsafe]);

  const hasExtensions = extensions.length > 0;

  return (
    <div
      data-react-fancy-content-renderer=""
      style={{ lineHeight: lineSpacing }}
      className={cn("text-sm", proseClasses, className)}
    >
      {hasExtensions ? (
        <RenderedContent html={html} extensions={extensions} unsafe={unsafe} />
      ) : (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}

ContentRenderer.displayName = "ContentRenderer";

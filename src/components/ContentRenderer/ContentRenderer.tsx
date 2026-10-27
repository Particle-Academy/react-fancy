import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { proseClasses, detectFormat } from "../Editor/editor.utils";
import { mergeExtensions } from "./extensions";
import { ContentBody } from "./RenderedContent";
import { CopyContext, useCopyPipeline, type CopyContextValue } from "./copy";
import { streamingCut } from "./markdown-blocks";
import type { ContentRendererProps } from "./ContentRenderer.types";

export function ContentRenderer({
  value,
  format = "auto",
  lineSpacing = 1.6,
  className,
  extensions: instanceExtensions,
  unsafe = false,
  copyButtons = true,
  onCopy,
  clipboardWriter,
  streaming = false,
}: ContentRendererProps) {
  const extensions = useMemo(
    () => mergeExtensions(instanceExtensions),
    [instanceExtensions],
  );

  // Guard nullish input: marked.parse throws "input parameter is undefined
  // or null", which during render would crash the whole React tree. Treat
  // missing content as empty.
  const safe = value ?? "";
  const resolvedFormat = format === "auto" ? detectFormat(safe) : format;

  const source = useMemo(() => {
    if (!streaming) return safe;
    const cut = streamingCut(
      safe,
      extensions.map((e) => e.tag),
      resolvedFormat === "markdown",
    );
    return safe.slice(0, cut);
  }, [safe, streaming, extensions, resolvedFormat]);

  const codeOn = copyButtons === true || (typeof copyButtons === "object" && copyButtons.code !== false);
  const tableOn = copyButtons === true || (typeof copyButtons === "object" && copyButtons.table !== false);
  const copyOn = codeOn || tableOn;

  const rootRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const announce = useCallback((message: string) => {
    // Clear first so the same message twice in a row is announced twice.
    setAnnouncement("");
    queueMicrotask(() => setAnnouncement(message));
  }, []);
  const copy = useCopyPipeline({ writer: clipboardWriter, onCopy, rootRef, announce });
  const copyContext = useMemo<CopyContextValue>(
    () => ({ code: codeOn, table: tableOn, copy }),
    [codeOn, tableOn, copy],
  );

  return (
    <div
      ref={rootRef}
      data-react-fancy-content-renderer=""
      data-streaming={streaming ? "true" : undefined}
      style={{ lineHeight: lineSpacing }}
      className={cn("text-sm", proseClasses, className)}
    >
      <CopyContext.Provider value={copyContext}>
        <ContentBody
          source={source}
          format={resolvedFormat}
          extensions={extensions}
          unsafe={unsafe}
        />
      </CopyContext.Provider>
      {copyOn && (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-react-fancy-content-renderer-live=""
          className="sr-only"
        >
          {announcement}
        </span>
      )}
    </div>
  );
}

ContentRenderer.displayName = "ContentRenderer";

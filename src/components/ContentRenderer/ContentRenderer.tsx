import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { visuallyHidden } from "../../utils/visually-hidden";
import { proseClasses, detectFormat } from "../Editor/editor.utils";
import { mergeExtensions } from "./extensions";
import { ContentBody } from "./RenderedContent";
import { CopyContext, useCopyPipeline, type CopyContextValue } from "./copy";
import { streamingCut, streamingProgressive } from "./markdown-blocks";
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

  const progressive = streaming === "progressive";
  const { source, openFence } = useMemo(() => {
    if (!streaming) return { source: safe, openFence: false };
    const tags = extensions.map((e) => e.tag);
    const markdown = resolvedFormat === "markdown";
    if (progressive) return streamingProgressive(safe, tags, markdown);
    return { source: safe.slice(0, streamingCut(safe, tags, markdown)), openFence: false };
  }, [safe, streaming, progressive, extensions, resolvedFormat]);

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
    () => ({ code: codeOn, table: tableOn, copy, holdTailCode: openFence }),
    [codeOn, tableOn, copy, openFence],
  );

  // The live region is `position: absolute`. With nothing positioned around it,
  // it escapes to an ancestor outside an unpositioned scroll container and
  // stretches the document (genie#1290). So the root contains it, unless the
  // host's className already positions the root (twMerge drops our `relative`
  // when it does): sticky / absolute / fixed contain it too, and an explicit
  // `static` is the host's call.
  const contain = copyOn && cn("relative", className).split(" ").includes("relative");

  return (
    <div
      ref={rootRef}
      data-react-fancy-content-renderer=""
      data-streaming={streaming ? "true" : undefined}
      data-streaming-mode={progressive ? "progressive" : undefined}
      style={contain ? { lineHeight: lineSpacing, position: "relative" } : { lineHeight: lineSpacing }}
      className={cn("text-sm", proseClasses, className)}
    >
      <CopyContext.Provider value={copyContext}>
        <ContentBody
          source={source}
          format={resolvedFormat}
          extensions={extensions}
          unsafe={unsafe}
          tail
        />
      </CopyContext.Provider>
      {copyOn && (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-react-fancy-content-renderer-live=""
          className="sr-only"
          style={visuallyHidden}
        >
          {announcement}
        </span>
      )}
    </div>
  );
}

ContentRenderer.displayName = "ContentRenderer";

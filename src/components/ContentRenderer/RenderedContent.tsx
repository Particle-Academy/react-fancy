import { useMemo } from "react";
import type { RenderExtension } from "./extensions";
import { parseSegments, mergeExtensions } from "./extensions";

interface RenderedContentProps {
  html: string;
  extensions?: RenderExtension[];
}

/**
 * Internal component that renders an HTML string with extension support.
 * Plain HTML segments use dangerouslySetInnerHTML; custom-tag segments
 * are rendered via their registered React component.
 */
export function RenderedContent({ html, extensions: instanceExtensions }: RenderedContentProps) {
  const extensions = useMemo(
    () => mergeExtensions(instanceExtensions),
    [instanceExtensions],
  );

  const segments = useMemo(
    () => parseSegments(html, extensions),
    [html, extensions],
  );

  // Fast path: no extensions matched — single dangerouslySetInnerHTML
  if (segments.length === 1 && segments[0].type === "html") {
    return <div dangerouslySetInnerHTML={{ __html: segments[0].content }} />;
  }

  // No content at all
  if (segments.length === 0) {
    return null;
  }

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === "html") {
          return segment.content ? (
            <div key={i} dangerouslySetInnerHTML={{ __html: segment.content }} />
          ) : null;
        }

        const ext = extensions.find(
          (e) => e.tag.toLowerCase() === segment.tag,
        );
        if (!ext) return null;

        const Component = ext.component;
        const isBlock = ext.block !== false;
        const Wrapper = isBlock ? "div" : "span";

        return (
          <Wrapper key={i} data-render-extension={segment.tag}>
            <Component content={segment.content} attributes={segment.attributes} />
          </Wrapper>
        );
      })}
    </>
  );
}

RenderedContent.displayName = "RenderedContent";

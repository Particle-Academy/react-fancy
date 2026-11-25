import { useContext, useMemo } from "react";
import { markdownToRawHtml } from "../../utils/markdown";
import { sanitizeHtml } from "../../utils/sanitize";
import type { RenderExtension } from "./extensions";
import { parseSegments, tagAttributes } from "./extensions";
import { splitFences, splitMarkdownBlocks, type FencePiece, type MarkdownBlock } from "./markdown-blocks";
import { CopyContext, HtmlChunk } from "./copy";
import type { ContentFenceRenderer } from "./ContentRenderer.types";

/** Fence renderers keyed by lower-cased language; `null` when there are none. */
export type FenceMap = ReadonlyMap<string, ContentFenceRenderer> | null;

/** `fences` prop -> a lookup by lower-cased language, or `null` for none. */
export function normalizeFences(fences: Record<string, ContentFenceRenderer> | undefined): FenceMap {
  if (!fences) return null;
  const map = new Map<string, ContentFenceRenderer>();
  for (const [language, component] of Object.entries(fences)) {
    if (component) map.set(language.toLowerCase(), component);
  }
  return map.size > 0 ? map : null;
}

type BodyPiece = MarkdownBlock | Extract<FencePiece, { type: "fence" }>;

/**
 * Markdown-body tags nest; past this depth a body is rendered as plain
 * sanitised content with no further extensions, so hostile input cannot
 * recurse without bound.
 */
const MAX_DEPTH = 8;

interface ContentBodyProps {
  source: string;
  format: "html" | "markdown";
  extensions: RenderExtension[];
  /** Fence renderers by language. Markdown only. */
  fences?: FenceMap;
  unsafe: boolean;
  depth?: number;
  /**
   * This body is the last thing the renderer shows, so under progressive
   * streaming it holds any block still arriving. Passed only to the last piece.
   */
  tail?: boolean;
}

/** Index of the last piece that renders anything, or -1. */
function lastIndexWith<T>(items: T[], renders: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) if (renders(items[i])) return i;
  return -1;
}

/**
 * Renders a source string. In markdown, extensions marked `markdown: true` are
 * lifted out of the SOURCE first (so their body is still markdown); every
 * other piece is converted, sanitised, and then searched for the remaining
 * extension tags as before.
 */
export function ContentBody({ source, format, extensions, fences = null, unsafe, depth = 0, tail = false }: ContentBodyProps) {
  const active = depth >= MAX_DEPTH ? [] : extensions;
  // Progressive streaming closed a still-open fence at the end: it must not
  // reach a fence renderer until it really closes.
  const holdTailCode = Boolean(useContext(CopyContext)?.holdTailCode) && tail;
  const blocks = useMemo((): BodyPiece[] | null => {
    if (format !== "markdown") return null;
    const mdTags = active.filter((e) => e.markdown).map((e) => e.tag);
    const tagged = splitMarkdownBlocks(source, mdTags);
    if (!fences) return tagged;
    const languages = [...fences.keys()];
    const tagLast = lastIndexWith(tagged, (b) => b.type === "tag" || b.source.trim() !== "");
    return tagged.flatMap((block, i): BodyPiece[] =>
      block.type === "markdown"
        ? (splitFences(block.source, languages, holdTailCode && i === tagLast) as BodyPiece[])
        : [block],
    );
  }, [source, format, active, fences, holdTailCode]);

  if (!blocks) {
    const html = unsafe ? source : sanitizeHtml(source);
    return (
      <RenderedContent
        html={html}
        extensions={active}
        unsafe={unsafe}
        fromMarkdown={false}
        depth={depth}
        tail={tail}
      />
    );
  }

  const last = tail
    ? lastIndexWith(blocks, (b) => b.type !== "markdown" || b.source.trim() !== "")
    : -1;

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "fence") {
          const Fence = fences?.get(block.language);
          if (!Fence) return null;
          return (
            <div key={i} data-render-fence={block.language}>
              <Fence code={block.code} language={block.language} info={block.info} />
            </div>
          );
        }
        if (block.type === "markdown") {
          const raw = markdownToRawHtml(block.source);
          const html = unsafe ? raw : sanitizeHtml(raw);
          return (
            <RenderedContent
              key={i}
              html={html}
              extensions={active}
              unsafe={unsafe}
              fromMarkdown
              depth={depth}
              tail={i === last}
            />
          );
        }
        const ext = active.find((e) => e.tag.toLowerCase() === block.tag);
        if (!ext) return null;
        const Component = ext.component;
        const Wrapper = ext.block !== false ? "div" : "span";
        return (
          <Wrapper key={i} data-render-extension={block.tag}>
            <Component content={block.body} attributes={tagAttributes(block.attrs, unsafe)}>
              <ContentBody
                source={block.body}
                format="markdown"
                extensions={active}
                fences={fences}
                unsafe={unsafe}
                depth={depth + 1}
                tail={i === last}
              />
            </Component>
          </Wrapper>
        );
      })}
    </>
  );
}

interface RenderedContentProps {
  html: string;
  extensions: RenderExtension[];
  /**
   * If true, html is rendered as-is without per-segment sanitization. Caller
   * (ContentBody) is expected to have already sanitized — or explicitly opted
   * out — at the top level.
   */
  unsafe: boolean;
  /** The HTML came from marked, so a code block's text ends in an added newline. */
  fromMarkdown: boolean;
  depth: number;
  /** See `ContentBodyProps.tail`. */
  tail?: boolean;
}

/**
 * Renders an HTML string with extension support. Plain HTML segments are
 * injected (with copy buttons); custom-tag segments are rendered via their
 * registered React component.
 */
export function RenderedContent({
  html,
  extensions,
  unsafe,
  fromMarkdown,
  depth,
  tail = false,
}: RenderedContentProps) {
  const segments = useMemo(() => parseSegments(html, extensions), [html, extensions]);

  const renderHtml = (content: string): string => (unsafe ? content : sanitizeHtml(content));

  if (segments.length === 0) return null;

  // Fast path: no extensions matched.
  if (segments.length === 1 && segments[0].type === "html") {
    return <HtmlChunk html={renderHtml(segments[0].content)} fromMarkdown={fromMarkdown} tail={tail} />;
  }

  const last = tail
    ? lastIndexWith(segments, (s) => s.type === "extension" || s.content.trim() !== "")
    : -1;

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === "html") {
          return segment.content ? (
            <HtmlChunk
              key={i}
              html={renderHtml(segment.content)}
              fromMarkdown={fromMarkdown}
              tail={i === last}
            />
          ) : null;
        }

        const ext = extensions.find((e) => e.tag.toLowerCase() === segment.tag);
        if (!ext) return null;

        const Component = ext.component;
        const Wrapper = ext.block !== false ? "div" : "span";
        // A markdown-body tag reached here only as HTML (inline, unclosed, or
        // in HTML content); its body is HTML, rendered the same way.
        const children = ext.markdown ? (
          <ContentBody
            source={segment.content}
            format="html"
            extensions={extensions}
            unsafe={unsafe}
            depth={depth + 1}
            tail={i === last}
          />
        ) : undefined;

        return (
          <Wrapper key={i} data-render-extension={segment.tag}>
            <Component content={segment.content} attributes={segment.attributes}>
              {children}
            </Component>
          </Wrapper>
        );
      })}
    </>
  );
}

RenderedContent.displayName = "RenderedContent";
ContentBody.displayName = "ContentBody";

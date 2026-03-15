import type { ComponentType } from "react";

/** Props passed to every render-extension component. */
export interface RenderExtensionProps {
  /** The inner content of the custom tag (raw string). */
  content: string;
  /** Parsed HTML attributes from the opening tag. */
  attributes: Record<string, string>;
}

/** Registers a custom tag with a React component for rendering. */
export interface RenderExtension {
  /** Tag name to match, e.g. "questions", "thinking". Case-insensitive. */
  tag: string;
  /** React component that renders the matched tag. */
  component: ComponentType<RenderExtensionProps>;
  /**
   * Whether this is a block-level element.
   * Block extensions are wrapped in a `<div>`, inline in a `<span>`.
   * @default true
   */
  block?: boolean;
}

/** A parsed segment — either raw HTML or a matched extension tag. */
export type ContentSegment =
  | { type: "html"; content: string }
  | { type: "extension"; tag: string; content: string; attributes: Record<string, string> };

// ---------------------------------------------------------------------------
// Global extension registry
// ---------------------------------------------------------------------------

const globalRegistry: RenderExtension[] = [];

/** Register a single render extension globally (available to all ContentRenderer and Editor instances). */
export function registerExtension(extension: RenderExtension): void {
  const idx = globalRegistry.findIndex(
    (e) => e.tag.toLowerCase() === extension.tag.toLowerCase(),
  );
  if (idx >= 0) {
    globalRegistry[idx] = extension;
  } else {
    globalRegistry.push(extension);
  }
}

/** Register multiple render extensions globally. */
export function registerExtensions(extensions: RenderExtension[]): void {
  for (const ext of extensions) {
    registerExtension(ext);
  }
}

/** Get a snapshot of the current global registry. */
export function getGlobalExtensions(): RenderExtension[] {
  return [...globalRegistry];
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Parse attributes from an opening tag string like `tag foo="bar" baz="qux"`. */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

/**
 * Split an HTML string into segments of plain HTML and matched extension tags.
 *
 * Handles:
 * - `<tag>content</tag>`
 * - `<tag attr="val">content</tag>`
 * - Nested different-tags inside the content (preserved as raw HTML)
 * - Self-nesting of the same tag (greedy — matches outermost)
 */
export function parseSegments(
  html: string,
  extensions: RenderExtension[],
): ContentSegment[] {
  if (extensions.length === 0) {
    return html ? [{ type: "html", content: html }] : [];
  }

  const tagNames = extensions.map((e) => e.tag).join("|");
  // Match opening tag with optional attributes, then content, then closing tag.
  // Uses a non-greedy match for content — if same-tag nesting is needed the
  // consumer should use distinct tag names.
  const pattern = new RegExp(
    `<(${tagNames})((?:\\s+[^>]*)?)>([\\s\\S]*?)<\\/\\1>`,
    "gi",
  );

  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    // Push any HTML before this match
    if (match.index > lastIndex) {
      segments.push({ type: "html", content: html.slice(lastIndex, match.index) });
    }

    const tag = match[1].toLowerCase();
    const rawAttrs = match[2] ? match[2].trim() : "";
    const innerContent = match[3];

    segments.push({
      type: "extension",
      tag,
      content: innerContent,
      attributes: rawAttrs ? parseAttributes(rawAttrs) : {},
    });

    lastIndex = match.index + match[0].length;
  }

  // Push any trailing HTML
  if (lastIndex < html.length) {
    segments.push({ type: "html", content: html.slice(lastIndex) });
  }

  return segments;
}

/**
 * Merge per-instance extensions with the global registry.
 * Instance extensions override globals with the same tag name.
 */
export function mergeExtensions(
  instanceExtensions?: RenderExtension[],
): RenderExtension[] {
  const globals = getGlobalExtensions();
  if (!instanceExtensions || instanceExtensions.length === 0) return globals;
  if (globals.length === 0) return instanceExtensions;

  const merged = [...globals];
  for (const ext of instanceExtensions) {
    const idx = merged.findIndex(
      (e) => e.tag.toLowerCase() === ext.tag.toLowerCase(),
    );
    if (idx >= 0) {
      merged[idx] = ext;
    } else {
      merged.push(ext);
    }
  }
  return merged;
}

import type { RenderExtension } from "../ContentRenderer/extensions";

/**
 * Shared prose typography classes for Editor.Content and ContentRenderer.
 * Hand-rolled since we don't depend on @tailwindcss/typography.
 */
export const proseClasses = [
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2",
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2",
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
  "[&_p]:mb-2",
  "[&_a]:text-blue-500 [&_a]:underline",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:mb-1",
  "[&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-600 dark:[&_blockquote]:border-zinc-600 dark:[&_blockquote]:text-zinc-400",
  "[&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-sm dark:[&_code]:bg-zinc-800",
  "[&_pre]:bg-zinc-950 [&_pre]:text-zinc-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto",
  "[&_pre_code]:bg-transparent [&_pre_code]:px-0",
  "[&_strong]:font-bold [&_em]:italic",
].join(" ");

const HTML_TAG_PATTERN = /<(p|div|br|h[1-6]|ul|ol|strong|em|a |img |table|pre|code|blockquote)[>\s/]/i;

/** Detect whether a string is likely HTML or Markdown. */
export function detectFormat(value: string): "html" | "markdown" {
  return HTML_TAG_PATTERN.test(value) ? "html" : "markdown";
}

/**
 * Build a set of known HTML tag names. Extension tags are excluded
 * so that the "strip remaining tags" step preserves them.
 */
const STANDARD_HTML_TAGS = new Set([
  "a", "abbr", "address", "area", "article", "aside", "audio",
  "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button",
  "canvas", "caption", "cite", "code", "col", "colgroup",
  "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt",
  "em", "embed",
  "fieldset", "figcaption", "figure", "footer", "form",
  "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html",
  "i", "iframe", "img", "input", "ins",
  "kbd",
  "label", "legend", "li", "link",
  "main", "map", "mark", "menu", "meta", "meter",
  "nav", "noscript",
  "object", "ol", "optgroup", "option", "output",
  "p", "param", "picture", "pre", "progress",
  "q",
  "rp", "rt", "ruby",
  "s", "samp", "script", "section", "select", "slot", "small", "source", "span",
  "strike", "strong", "style", "sub", "summary", "sup",
  "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track",
  "u", "ul",
  "var", "video",
  "wbr",
]);

/**
 * Lightweight HTML-to-Markdown converter for editor output.
 * Handles the most common inline/block formatting produced by contentEditable.
 * Custom extension tags are preserved as-is in the output.
 */
export function htmlToMarkdown(html: string): string {
  let md = html;

  // Block elements first
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n");
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n");
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n");

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[uo]l[^>]*>/gi, "\n");

  // Inline formatting
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, "$1");
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, "~~$1~~");
  md = md.replace(/<strike[^>]*>(.*?)<\/strike>/gi, "~~$1~~");
  md = md.replace(/<del[^>]*>(.*?)<\/del>/gi, "~~$1~~");
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n");

  // Line breaks and paragraphs
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<div[^>]*>(.*?)<\/div>/gi, "$1\n");

  // Strip only standard HTML tags — preserve unknown/custom tags
  md = md.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName: string) => {
    return STANDARD_HTML_TAGS.has(tagName.toLowerCase()) ? "" : match;
  });

  // Decode common HTML entities
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, " ");

  // Clean up extra whitespace
  md = md.replace(/\n{3,}/g, "\n\n");
  md = md.trim();

  return md;
}

/**
 * Generate CSS classes to visually distinguish custom extension tags
 * inside the contentEditable area. Returns Tailwind-style descendant selectors.
 */
export function extensionEditorClasses(extensions: RenderExtension[]): string {
  if (extensions.length === 0) return "";

  return extensions
    .map((ext) => {
      const tag = ext.tag.toLowerCase();
      return [
        `[&_${tag}]:block`,
        `[&_${tag}]:my-2`,
        `[&_${tag}]:rounded-lg`,
        `[&_${tag}]:border`,
        `[&_${tag}]:border-dashed`,
        `[&_${tag}]:border-zinc-300`,
        `[&_${tag}]:bg-zinc-50`,
        `[&_${tag}]:p-3`,
        `[&_${tag}]:text-xs`,
        `dark:[&_${tag}]:border-zinc-600`,
        `dark:[&_${tag}]:bg-zinc-800/50`,
      ].join(" ");
    })
    .join(" ");
}

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
  "[&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[color:var(--fancy-text-subtle,var(--color-zinc-600))] dark:[&_blockquote]:border-zinc-600 dark:[&_blockquote]:text-[color:var(--fancy-text-subtle-dark,var(--color-zinc-400))]",
  "[&_code]:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] [&_code]:px-1 [&_code]:rounded [&_code]:text-sm dark:[&_code]:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]",
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
 * HTML-to-Markdown converter for editor output.
 *
 * Walks the parsed DOM rather than rewriting the HTML string, because markup
 * structure is what decides markdown spacing and a string rewrite cannot see
 * it. The regex version this replaces turned every whitespace text node
 * between tags into a literal newline: marked emits `</li>\n<li>`, so every
 * tight list came back with a blank line between items — and a fresh item
 * from Enter (which Chromium inserts with NO whitespace node) came back
 * without one, so an edit to the last item made the list loose after the
 * FIRST item only.
 *
 * Rules: whitespace-only text between blocks is formatting, not content.
 * Blocks are separated by a blank line; a list is tight unless one of its
 * items holds a `<p>` (marked's marker for a loose list), so loose lists stay
 * loose and tight lists stay tight. Custom extension tags are preserved as-is.
 *
 * Without a DOM (SSR) it falls back to the older string rewrite.
 */
export function htmlToMarkdown(html: string): string {
  if (typeof document === "undefined") return legacyHtmlToMarkdown(html);
  const template = document.createElement("template");
  template.innerHTML = html;
  return serializeBlocks(template.content).replace(/^\n+/, "").replace(/\s+$/, "");
}

type Block = { kind: "block" | "div" | "inline"; text: string; tag?: string };

const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "details", "dialog", "div", "dl",
  "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4",
  "h5", "h6", "header", "hgroup", "hr", "li", "main", "nav", "ol", "p", "pre",
  "section", "table", "ul",
]);

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

function tagOf(node: Node): string {
  return isElement(node) ? node.tagName.toLowerCase() : "";
}

function isCustomTag(tag: string): boolean {
  return tag !== "" && !STANDARD_HTML_TAGS.has(tag);
}

function isBlockNode(node: Node): boolean {
  return isElement(node) && BLOCK_TAGS.has(tagOf(node));
}

/** Split a node's children into blocks, serialising each. */
function collectBlocks(parent: Node): Block[] {
  const blocks: Block[] = [];
  let run: Node[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const text = serializeInlineRun(run);
    run = [];
    if (text.trim() !== "") blocks.push({ kind: "inline", text });
  };
  for (const child of Array.from(parent.childNodes)) {
    if (isBlockNode(child)) {
      flush();
      const el = child as Element;
      const tag = tagOf(el);
      blocks.push({ kind: tag === "div" ? "div" : "block", text: serializeBlock(el), tag });
    } else {
      run.push(child);
    }
  }
  flush();
  return blocks;
}

/**
 * Join blocks: a blank line between real blocks; a single newline next to a
 * `<div>`, which is the line contentEditable makes when Enter is pressed
 * outside any paragraph.
 */
function joinBlocks(blocks: Block[]): string {
  let out = "";
  blocks.forEach((b, i) => {
    if (i > 0) {
      const prev = blocks[i - 1]!;
      out += prev.kind === "div" || b.kind === "div" ? "\n" : "\n\n";
    }
    out += b.text;
  });
  return out;
}

function serializeBlocks(parent: Node): string {
  return joinBlocks(collectBlocks(parent));
}

function serializeBlock(el: Element): string {
  const tag = tagOf(el);
  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return `${"#".repeat(Number(tag[1]))} ${serializeInline(el).trim()}`;
    case "p":
    case "div":
      return trimEdgeNewlines(serializeInline(el, true));
    case "ul":
    case "ol":
      return serializeList(el);
    case "pre":
      return serializePre(el);
    case "blockquote":
      return serializeBlocks(el)
        .split("\n")
        .map((line) => (line === "" ? ">" : `> ${line}`))
        .join("\n");
    case "hr":
      return "---";
    default:
      return serializeBlocks(el);
  }
}

function serializePre(el: Element): string {
  const code = el.querySelector("code");
  const lang = /(?:^|\s)language-(\S+)/.exec(code?.getAttribute("class") ?? "")?.[1] ?? "";
  const text = (code ?? el).textContent ?? "";
  return `\`\`\`${lang}\n${text.replace(/\n$/, "")}\n\`\`\``;
}

function serializeList(list: Element): string {
  const ordered = tagOf(list) === "ol";
  let n = ordered ? Number.parseInt(list.getAttribute("start") ?? "1", 10) || 1 : 0;
  const items = Array.from(list.children);
  // marked wraps item text in <p> only when the list is loose.
  const loose = items.some(
    (li) => tagOf(li) === "li" && Array.from(li.children).some((c) => tagOf(c) === "p"),
  );
  const out: string[] = [];
  for (const item of items) {
    const tag = tagOf(item);
    if (tag === "ul" || tag === "ol") {
      // A list nested directly in a list (contentEditable's indent) belongs
      // to the item before it.
      const nested = indent(serializeList(item), ordered ? 3 : 2);
      if (out.length > 0) out[out.length - 1] += `\n${nested}`;
      else out.push(nested);
      continue;
    }
    if (tag !== "li") continue;
    const marker = ordered ? `${n++}. ` : "- ";
    out.push(`${marker}${indent(serializeListItem(item), marker.length, true)}`.replace(/[ \t]+$/, ""));
  }
  return out.join(loose ? "\n\n" : "\n");
}

/** An item's content: a nested list sits on the next line, other blocks after a blank line. */
function serializeListItem(li: Element): string {
  const blocks = collectBlocks(li);
  let out = "";
  blocks.forEach((b, i) => {
    if (i > 0) out += b.tag === "ul" || b.tag === "ol" ? "\n" : "\n\n";
    out += b.text;
  });
  return out;
}

/** Indent every non-empty line (optionally skipping the first) by `width` spaces. */
function indent(text: string, width: number, skipFirst = false): string {
  const pad = " ".repeat(width);
  return text
    .split("\n")
    .map((line, i) => (line === "" || (skipFirst && i === 0) ? line : pad + line))
    .join("\n");
}

function trimEdgeNewlines(text: string): string {
  return text.replace(/^\n+/, "").replace(/\n+$/, "");
}

function serializeInlineRun(nodes: Node[]): string {
  return trimEdgeNewlines(nodes.map((n) => serializeInlineNode(n)).join(""));
}

/**
 * Serialise an element's children as inline content. In a block, a trailing
 * `<br>` is the placeholder contentEditable keeps in an empty line, not a
 * line break the person typed.
 */
function serializeInline(el: Element, dropTrailingBr = false): string {
  const children = Array.from(el.childNodes);
  if (dropTrailingBr) {
    while (children.length > 0) {
      const last = children[children.length - 1]!;
      if (tagOf(last) === "br") children.pop();
      else break;
    }
  }
  return children.map((n) => serializeInlineNode(n)).join("");
}

function serializeInlineNode(node: Node): string {
  if (node.nodeType === 3) return (node.textContent ?? "").replace(/ /g, " ");
  if (!isElement(node)) return "";
  const tag = tagOf(node);
  if (isCustomTag(tag)) return node.outerHTML;
  if (BLOCK_TAGS.has(tag)) return serializeBlock(node);
  const inner = () => serializeInline(node);
  switch (tag) {
    case "br":
      return "\n";
    case "strong":
    case "b":
      return `**${inner()}**`;
    case "em":
    case "i":
      return `*${inner()}*`;
    case "s":
    case "strike":
    case "del":
      return `~~${inner()}~~`;
    case "code":
      return `\`${node.textContent ?? ""}\``;
    case "a": {
      const href = node.getAttribute("href");
      if (href == null) return inner();
      const title = node.getAttribute("title");
      return `[${inner()}](${href}${title ? ` "${title}"` : ""})`;
    }
    case "img": {
      const title = node.getAttribute("title");
      return `![${node.getAttribute("alt") ?? ""}](${node.getAttribute("src") ?? ""}${title ? ` "${title}"` : ""})`;
    }
    default:
      return inner();
  }
}

/** String-rewrite converter, kept only for environments with no DOM. */
function legacyHtmlToMarkdown(html: string): string {
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

  // Decode common HTML entities. Decode &amp; LAST so we never double-unescape:
  // e.g. "&amp;lt;" must decode to the literal "&lt;", not to "<".
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, " ");
  md = md.replace(/&amp;/g, "&");

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

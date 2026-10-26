import { marked, type Token, type Tokens } from "marked";
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
 * Given the `source` map {@link markdownToEditorHtml} produced when the
 * document was loaded, output is source-preserving instead: every block the
 * person did not change is emitted from its original markdown, byte for byte.
 *
 * Without a DOM (SSR) it falls back to the older string rewrite.
 */
export function htmlToMarkdown(html: string, source?: MarkdownSource | null): string {
  if (typeof document === "undefined") return legacyHtmlToMarkdown(html);
  const template = document.createElement("template");
  template.innerHTML = html;
  if (source) return serializeWithSource(template.content, source);
  return serializeBlocks(template.content).replace(/^\n+/, "").replace(/\s+$/, "");
}

/* ------------------------------------------------------------------------ *
 * Source-preserving markdown
 *
 * When markdown is loaded, each top-level block (paragraph, heading, list,
 * table, code block, quote, rule, HTML block) is rendered on its own and its
 * elements are tagged `data-md-block="<n>"`, with the block's ORIGINAL source
 * text and a snapshot of its rendered HTML kept beside it. List items get
 * `data-md-item`, table rows `data-md-row`, mapped the same way.
 *
 * On output, a block whose elements still serialise to the snapshot is
 * emitted from its source slice, exactly. Only changed or new blocks are
 * serialised from the DOM, and the source between two blocks that are still
 * neighbours (blank lines, link reference definitions, HTML comments) is
 * emitted verbatim, as is the text after the last block.
 *
 * Chromium clones the element it splits on Enter, attributes included, so a
 * tag can appear twice; the FIRST copy that still matches its snapshot owns
 * the source, and any other copy is treated as new content.
 * ------------------------------------------------------------------------ */

const BLOCK_ATTR = "data-md-block";
const ITEM_ATTR = "data-md-item";
const ROW_ATTR = "data-md-row";

interface SourceList {
  bullet: string;
  delimiter: string;
  loose: boolean;
  /** Each item's source, trailing newlines excluded. */
  items: string[];
  /** itemGaps[k]: the source between item k and item k + 1. */
  itemGaps: string[];
  itemSnapshots: string[];
}

interface SourceTable {
  /** The table's source lines: header, alignment row, then one per body row. */
  lines: string[];
  columns: number;
  /** Snapshot per source line index (0 = header, 2.. = body rows). */
  rowSnapshots: Map<number, string>;
}

interface SourceBlock {
  /** The block's source, trailing newlines excluded. */
  raw: string;
  /** Concatenated outerHTML of the block's rendered elements, as seeded. */
  snapshot: string;
  elementCount: number;
  list?: SourceList;
  table?: SourceTable;
}

/** The original source of a markdown document, mapped to the blocks rendered from it. */
export interface MarkdownSource {
  /** Source before the first block. */
  leading: string;
  blocks: SourceBlock[];
  /** gaps[i]: the source between block i and block i + 1, or the end of the document. */
  gaps: string[];
}

function stripTrailingNewlines(text: string): string {
  return text.replace(/\n+$/, "");
}

function indexAttr(el: Element, attr: string, size: number): number | undefined {
  const value = el.getAttribute(attr);
  if (value == null || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return n < size ? n : undefined;
}

/**
 * Render markdown for the Editor, tagging each block with its source.
 * Returns `source: null` (plain rendering) when the source cannot be mapped
 * exactly: no DOM, or `\r` line endings, which the lexer normalises away.
 */
export function markdownToEditorHtml(
  md: string,
  sanitize: (html: string) => string = (html) => html,
): { html: string; source: MarkdownSource | null } {
  const plain = () => ({
    html: sanitize((marked.parse(md, { async: false }) as string).trim()),
    source: null,
  });
  if (typeof document === "undefined" || md.includes("\r")) return plain();

  const tokens = marked.lexer(md);
  const parts: string[] = [];
  const spans: { start: number; end: number; token: Token }[] = [];
  let cursor = 0;
  for (const token of tokens) {
    if (token.type === "space") continue;
    const at = md.indexOf(token.raw, cursor);
    if (at < 0) return plain();
    cursor = at + token.raw.length;

    const template = document.createElement("template");
    template.innerHTML = marked.parser([token]);
    let nodes = Array.from(template.content.childNodes);
    const strayText = nodes.some((n) => n.nodeType === 3 && (n.textContent ?? "").trim() !== "");
    if (!nodes.some(isElement) && !strayText) {
      // Renders nothing visible (an HTML comment): its source stays in the gap.
      parts.push(template.innerHTML.trim());
      continue;
    }
    if (strayText) {
      const wrapper = document.createElement("div");
      wrapper.append(...nodes);
      template.content.append(wrapper);
      nodes = [wrapper];
    }
    const id = spans.length;
    const elements = nodes.filter(isElement);
    for (const el of elements) el.setAttribute(BLOCK_ATTR, String(id));
    if (token.type === "list" && elements.length === 1) {
      const items = Array.from(elements[0]!.children).filter((c) => tagOf(c) === "li");
      if (items.length === (token as Tokens.List).items.length) {
        items.forEach((li, k) => li.setAttribute(ITEM_ATTR, String(k)));
      }
    }
    if (token.type === "table" && elements.length === 1) {
      const rows = tableRows(elements[0]!);
      if (rows.length === (token as Tokens.Table).rows.length + 1) {
        rows.forEach((tr, i) => tr.setAttribute(ROW_ATTR, String(i === 0 ? 0 : i + 1)));
      }
    }
    parts.push(template.innerHTML.trim());
    spans.push({ start: at, end: at + stripTrailingNewlines(token.raw).length, token });
  }

  const html = sanitize(parts.join("\n"));
  if (spans.length === 0) return { html, source: null };

  // Snapshot what the DOM will actually hold — after sanitising.
  const seeded = document.createElement("template");
  seeded.innerHTML = html;
  const byId = new Map<number, Element[]>();
  for (const node of Array.from(seeded.content.childNodes)) {
    if (!isElement(node)) continue;
    const id = indexAttr(node, BLOCK_ATTR, spans.length);
    if (id === undefined) continue;
    byId.set(id, [...(byId.get(id) ?? []), node]);
  }

  const blocks: SourceBlock[] = spans.map((span, id) => {
    const elements = byId.get(id) ?? [];
    const block: SourceBlock = {
      raw: md.slice(span.start, span.end),
      snapshot: elements.map((el) => el.outerHTML).join(""),
      elementCount: elements.length,
    };
    if (span.token.type === "list" && elements.length === 1) {
      block.list = sourceList(md, span.start, span.token as Tokens.List, elements[0]!);
    }
    if (span.token.type === "table" && elements.length === 1) {
      block.table = sourceTable(block.raw, span.token as Tokens.Table, elements[0]!);
    }
    return block;
  });
  const gaps = spans.map((span, i) => md.slice(span.end, spans[i + 1]?.start ?? md.length));
  return { html, source: { leading: md.slice(0, spans[0]!.start), blocks, gaps } };
}

function sourceList(md: string, start: number, token: Tokens.List, list: Element): SourceList | undefined {
  const lis = Array.from(list.children).filter((c) => tagOf(c) === "li");
  if (lis.length !== token.items.length || lis.length === 0) return undefined;
  const items: string[] = [];
  const bounds: [number, number][] = [];
  let cursor = start;
  for (const item of token.items) {
    const at = md.indexOf(item.raw, cursor);
    if (at < 0) return undefined;
    const body = stripTrailingNewlines(item.raw);
    items.push(body);
    bounds.push([at, at + body.length]);
    cursor = at + item.raw.length;
  }
  const itemGaps = bounds.slice(0, -1).map(([, end], k) => md.slice(end, bounds[k + 1]![0]));
  const first = items[0]!;
  return {
    bullet: /^\s*([*+-])/.exec(first)?.[1] ?? "-",
    delimiter: /^\s*\d+([.)])/.exec(first)?.[1] ?? ".",
    loose: token.loose,
    items,
    itemGaps,
    itemSnapshots: lis.map((li) => li.outerHTML),
  };
}

function sourceTable(raw: string, token: Tokens.Table, table: Element): SourceTable | undefined {
  const lines = raw.split("\n");
  const rows = tableRows(table);
  if (lines.length !== rows.length + 1) return undefined;
  const rowSnapshots = new Map<number, string>();
  for (const tr of rows) {
    const r = indexAttr(tr, ROW_ATTR, lines.length);
    if (r !== undefined) rowSnapshots.set(r, tr.outerHTML);
  }
  return { lines, columns: token.header.length, rowSnapshots };
}

type Piece = { text: string; id?: number; kind: Block["kind"] };

function outerHtmlOf(nodes: readonly Node[]): string {
  return nodes.filter(isElement).map((el) => el.outerHTML).join("");
}

function serializeWithSource(root: Node, src: MarkdownSource): string {
  // 1. Group the top-level nodes: runs sharing one block tag, and runs of untagged content.
  type Segment = { id?: number; nodes: Node[] };
  const segments: Segment[] = [];
  for (const node of Array.from(root.childNodes)) {
    const last = segments[segments.length - 1];
    if (node.nodeType === 3 && (node.textContent ?? "").trim() === "") {
      if (last && last.id === undefined) last.nodes.push(node);
      continue;
    }
    const id = isElement(node) ? indexAttr(node, BLOCK_ATTR, src.blocks.length) : undefined;
    if (last && last.id === id) last.nodes.push(node);
    else segments.push({ id, nodes: [node] });
  }

  // 2. The first segment per block that still matches its snapshot owns the source.
  const verbatim = new Map<number, number>();
  segments.forEach((seg, i) => {
    if (seg.id === undefined || verbatim.has(seg.id)) return;
    if (outerHtmlOf(seg.nodes) === src.blocks[seg.id]!.snapshot) verbatim.set(seg.id, i);
  });

  // 3. One piece per output block.
  const pieces: Piece[] = [];
  const owned = new Set<number>(verbatim.keys());
  const fresh = (nodes: readonly Node[]) => {
    for (const b of collectBlocks(nodes)) pieces.push({ text: b.text, kind: b.kind });
  };
  segments.forEach((seg, i) => {
    if (seg.id === undefined) return fresh(seg.nodes);
    const id = seg.id;
    const block = src.blocks[id]!;
    if (verbatim.get(id) === i) return void pieces.push({ text: block.raw, id, kind: "block" });
    if (owned.has(id)) return fresh(seg.nodes);
    owned.add(id);
    if (block.elementCount === 1) {
      // Enter at the edge of a block: the original survives whole beside its clone.
      const j = seg.nodes.findIndex((n) => isElement(n) && n.outerHTML === block.snapshot);
      if (j >= 0) {
        fresh(seg.nodes.slice(0, j));
        pieces.push({ text: block.raw, id, kind: "block" });
        fresh(seg.nodes.slice(j + 1));
        return;
      }
    }
    pieces.push({ text: serializeChangedBlock(seg.nodes, block), id, kind: "block" });
  });
  if (pieces.length === 0) return "";

  // 4. Join, reusing the original source between blocks that are still neighbours.
  const used = new Set<number>();
  const hasContent = (gap: string) => gap.trim() !== "";
  const separator = (a: Piece, b: Piece): string => {
    if (a.id !== undefined && b.id === a.id + 1) {
      used.add(a.id);
      return src.gaps[a.id]!;
    }
    const fallback = a.kind === "div" || b.kind === "div" ? "\n" : "\n\n";
    if (a.id === undefined || used.has(a.id)) return fallback;
    // Blocks between a and b were deleted: keep any definitions or comments they sat beside.
    const upto = b.id !== undefined && b.id > a.id ? b.id : a.id + 1;
    const range: number[] = [];
    for (let g = a.id; g < upto; g++) if (!used.has(g)) range.push(g);
    for (const g of range) used.add(g);
    const kept = range.map((g) => src.gaps[g]!).filter(hasContent).map((g) => g.trim());
    if (kept.length > 0) return `\n\n${kept.join("\n\n")}\n\n`;
    const own = src.gaps[a.id]!;
    return (own.match(/\n/g)?.length ?? 0) >= 2 ? own : fallback;
  };

  let out = src.leading;
  pieces.forEach((piece, i) => {
    if (i > 0) out += separator(pieces[i - 1]!, piece);
    out += piece.text;
  });

  const lastId = src.blocks.length - 1;
  const trailing = src.gaps[lastId]!;
  if (pieces[pieces.length - 1]!.id === lastId && !used.has(lastId)) {
    used.add(lastId);
    out += trailing;
  } else {
    const orphans = src.gaps
      .filter((gap, g) => !used.has(g) && hasContent(gap))
      .map((gap) => gap.trim());
    if (orphans.length > 0) out += `\n\n${orphans.join("\n\n")}`;
    out += /\s*$/.exec(trailing)![0];
  }
  return out;
}

function serializeChangedBlock(nodes: readonly Node[], block: SourceBlock): string {
  const elements = nodes.filter(isElement);
  if (elements.length === 1) {
    const el = elements[0]!;
    const tag = tagOf(el);
    if (block.list && (tag === "ul" || tag === "ol")) return serializeListWithSource(el, block.list);
    if (block.table && tag === "table") return serializeTableWithSource(el, block.table);
  }
  return joinBlocks(collectBlocks(nodes));
}

/**
 * A changed list: untouched items keep their source; changed and new items
 * are serialised with the list's original marker. Between two items that are
 * still neighbours the original separator is kept; elsewhere the separator
 * last used in the list is repeated.
 */
function serializeListWithSource(list: Element, info: SourceList): string {
  const ordered = tagOf(list) === "ol";
  const children = Array.from(list.children);
  const verbatim = new Map<number, Element>();
  for (const li of children) {
    if (tagOf(li) !== "li") continue;
    const k = indexAttr(li, ITEM_ATTR, info.items.length);
    if (k !== undefined && !verbatim.has(k) && li.outerHTML === info.itemSnapshots[k]) verbatim.set(k, li);
  }
  const owned = new Set<number>(verbatim.keys());
  const out: { text: string; k?: number }[] = [];
  let num = ordered ? (Number.parseInt(list.getAttribute("start") ?? "1", 10) || 1) - 1 : 0;
  const numberOf = (k: number) => Number(/^\s*(\d+)/.exec(info.items[k]!)?.[1] ?? Number.NaN);
  for (const child of children) {
    const tag = tagOf(child);
    if (tag === "ul" || tag === "ol") {
      const nested = indent(serializeList(child), ordered ? 3 : 2);
      if (out.length > 0) out[out.length - 1]!.text += `\n${nested}`;
      else out.push({ text: nested });
      continue;
    }
    if (tag !== "li") continue;
    const k = indexAttr(child, ITEM_ATTR, info.items.length);
    if (k !== undefined && verbatim.get(k) === child) {
      if (ordered && !Number.isNaN(numberOf(k))) num = numberOf(k);
      out.push({ text: info.items[k]!, k });
      continue;
    }
    const mine = k !== undefined && !owned.has(k) ? k : undefined;
    if (mine !== undefined) owned.add(mine);
    num = ordered && mine !== undefined && !Number.isNaN(numberOf(mine)) ? numberOf(mine) : num + 1;
    const marker = ordered ? `${num}${info.delimiter} ` : `${info.bullet} `;
    out.push({
      text: `${marker}${indent(serializeListItem(child), marker.length, true)}`.replace(/[ \t]+$/, ""),
      k: mine,
    });
  }
  let last: string | undefined;
  let text = "";
  out.forEach((item, i) => {
    if (i > 0) {
      const prev = out[i - 1]!;
      const sep =
        prev.k !== undefined && item.k === prev.k + 1
          ? info.itemGaps[prev.k]!
          : (last ?? info.itemGaps[0] ?? (info.loose ? "\n\n" : "\n"));
      last = sep;
      text += sep;
    }
    text += item.text;
  });
  return text;
}

/**
 * A changed table: untouched rows keep their source line, the alignment row
 * is kept while the column count is unchanged, edited and new rows are
 * serialised as GFM rows.
 */
function serializeTableWithSource(table: Element, info: SourceTable): string {
  const rows = tableRows(table);
  if (rows.length === 0) return "";
  const claimed = new Set<number>();
  const lines: string[] = [];
  rows.forEach((tr, i) => {
    const r = indexAttr(tr, ROW_ATTR, info.lines.length);
    if (r !== undefined && r !== 1 && !claimed.has(r) && tr.outerHTML === info.rowSnapshots.get(r)) {
      claimed.add(r);
      lines.push(info.lines[r]!);
    } else {
      lines.push(serializeTableRow(tr));
    }
    if (i === 0) {
      lines.push(tableCells(tr).length === info.columns ? info.lines[1]! : tableDelimiterRow(tr));
    }
  });
  return lines.join("\n");
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

/** Split a node's children (or a list of sibling nodes) into blocks, serialising each. */
function collectBlocks(parent: Node | readonly Node[]): Block[] {
  const blocks: Block[] = [];
  let run: Node[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const text = serializeInlineRun(run);
    run = [];
    if (text.trim() !== "") blocks.push({ kind: "inline", text });
  };
  const nodes = Array.isArray(parent) ? parent : Array.from((parent as Node).childNodes);
  for (const child of nodes) {
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
    case "table":
      return serializeTable(el);
    default:
      return serializeBlocks(el);
  }
}

/** The rows of a table, in document order, excluding rows of nested tables. */
function tableRows(table: Element): Element[] {
  return Array.from(table.querySelectorAll("tr")).filter((tr) => tr.closest("table") === table);
}

function tableCells(tr: Element): Element[] {
  return Array.from(tr.children).filter((c) => tagOf(c) === "td" || tagOf(c) === "th");
}

/**
 * A cell's inline content on one line. GFM cells cannot hold a line break, so
 * a typed one becomes a literal `<br>`; every `|` is escaped, including inside
 * code spans, which is how GFM spells a pipe in a cell.
 */
function serializeTableCell(cell: Element): string {
  const children = Array.from(cell.childNodes);
  while (children.length > 0 && tagOf(children[children.length - 1]!) === "br") children.pop();
  return children
    .map((n) => (tagOf(n) === "br" ? "<br>" : serializeInlineNode(n)))
    .join("")
    .replace(/\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function serializeTableRow(tr: Element): string {
  return `| ${tableCells(tr).map(serializeTableCell).join(" | ")} |`;
}

function tableDelimiterRow(header: Element): string {
  const marks = tableCells(header).map((cell) => {
    const align = cell.getAttribute("align") || (cell as HTMLElement).style?.textAlign || "";
    if (align === "left") return ":---";
    if (align === "center") return ":---:";
    if (align === "right") return "---:";
    return "---";
  });
  return `| ${marks.join(" | ")} |`;
}

/** A GFM table: header row, alignment row, body rows. */
function serializeTable(table: Element): string {
  const rows = tableRows(table);
  if (rows.length === 0) return "";
  const lines = rows.map(serializeTableRow);
  lines.splice(1, 0, tableDelimiterRow(rows[0]!));
  return lines.join("\n");
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

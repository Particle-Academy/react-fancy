/**
 * Source-level scanning for ContentRenderer: lifting custom tags with a
 * MARKDOWN body out of the source before it is converted, and finding where an
 * in-progress stream should be cut so a half-arrived tag or fence never shows.
 *
 * Both work on the markdown SOURCE and both must ignore code: a `<result>`
 * inside a fenced block or an inline code span is an example, not a tag.
 */

/** A complete custom tag found outside code. */
interface TagToken {
  kind: "open" | "close";
  /** Lower-cased tag name. */
  name: string;
  start: number;
  end: number;
  /** Raw attribute text of an opening tag (may be empty). */
  attrs: string;
  /** The tag starts its line, after at most three spaces of indent. */
  lineStart: boolean;
}

interface ScanResult {
  tokens: TagToken[];
  /** Start of the line that opened a fence which never closed, or -1. */
  openFenceStart: number;
  /** The fence that never closed (its marker character and length), or null. */
  openFence: { char: string; len: number } | null;
}

/** A piece of markdown source: plain markdown, or a lifted tag + its body. */
export type MarkdownBlock =
  | { type: "markdown"; source: string }
  | { type: "tag"; tag: string; attrs: string; body: string };

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Blank out inline code spans so tag search skips them; keeps offsets. */
function maskInlineCode(line: string): string {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (line[i] !== "`") {
      out += line[i];
      i++;
      continue;
    }
    let n = 0;
    while (line[i + n] === "`") n++;
    const fence = "`".repeat(n);
    // The closing run must be exactly n backticks long.
    let search = i + n;
    let close = -1;
    while (search < line.length) {
      const at = line.indexOf(fence, search);
      if (at < 0) break;
      let len = 0;
      while (line[at + len] === "`") len++;
      if (len === n) {
        close = at;
        break;
      }
      search = at + len;
    }
    if (close < 0) {
      out += fence;
      i += n;
      continue;
    }
    out += " ".repeat(close + n - i);
    i = close + n;
  }
  return out;
}

function scan(src: string, names: string[], trackFences: boolean): ScanResult {
  const tokens: TagToken[] = [];
  let openFenceStart = -1;
  if (names.length === 0 && !trackFences) return { tokens, openFenceStart, openFence: null };

  const tagRe = names.length
    ? new RegExp(`<(\\/?)(${names.map(escapeRegExp).join("|")})(?=[\\s>/])([^>]*)>`, "gi")
    : null;

  let fence: { char: string; len: number } | null = null;
  let pos = 0;
  while (pos <= src.length) {
    const nl = src.indexOf("\n", pos);
    const lineEnd = nl < 0 ? src.length : nl;
    const line = src.slice(pos, lineEnd);

    if (trackFences) {
      if (fence) {
        const close = new RegExp(`^ {0,3}${fence.char === "`" ? "`" : "~"}{${fence.len},}\\s*$`);
        if (close.test(line)) {
          fence = null;
          openFenceStart = -1;
        }
        pos = lineEnd + 1;
        if (nl < 0) break;
        continue;
      }
      const m = FENCE_OPEN.exec(line);
      if (m && !(m[1][0] === "`" && m[2].includes("`"))) {
        fence = { char: m[1][0], len: m[1].length };
        openFenceStart = pos;
        pos = lineEnd + 1;
        if (nl < 0) break;
        continue;
      }
    }

    if (tagRe) {
      const masked = trackFences ? maskInlineCode(line) : line;
      const indent = /^ {0,3}/.exec(masked)![0].length;
      tagRe.lastIndex = 0;
      let t: RegExpExecArray | null;
      while ((t = tagRe.exec(masked)) !== null) {
        const isClose = t[1] === "/";
        const attrs = t[3];
        if (isClose && attrs.trim() !== "") continue;
        if (!isClose && attrs.trimEnd().endsWith("/")) continue; // self-closing
        tokens.push({
          kind: isClose ? "close" : "open",
          name: t[2].toLowerCase(),
          start: pos + t.index,
          end: pos + t.index + t[0].length,
          attrs: isClose ? "" : attrs.trim(),
          lineStart: t.index === indent,
        });
      }
    }

    if (nl < 0) break;
    pos = lineEnd + 1;
  }

  return { tokens, openFenceStart, openFence: fence };
}

/**
 * Where a partial tag that could still become a registered one starts on the
 * last line (`<`, `</res`, `<result title="x`), or -1. A `<` that cannot
 * become a known tag (`a < b`, `a<b`) is prose and is never held back.
 */
function partialTagAt(lastLine: string, names: string[], markdown: boolean): number {
  if (!names.length) return -1;
  const masked = markdown ? maskInlineCode(lastLine) : lastLine;
  const lt = masked.lastIndexOf("<");
  if (lt < 0) return -1;
  const m = /^<(\/?)([A-Za-z][\w-]*)?([^>]*)$/.exec(masked.slice(lt));
  if (!m) return -1;
  const name = (m[2] ?? "").toLowerCase();
  const rest = m[3];
  let partial = false;
  if (!name) partial = rest === "";
  else if (names.includes(name)) partial = rest === "" || /^\s/.test(rest);
  else partial = rest === "" && names.some((n) => n.startsWith(name));
  return partial ? lt : -1;
}

/** Registered tags opened before `cut` and not yet closed, outermost first. */
function openTagsBefore(tokens: TagToken[], cut: number): TagToken[] {
  const stack: TagToken[] = [];
  for (const t of tokens) {
    if (t.start >= cut) break;
    if (t.kind === "open") {
      stack.push(t);
      continue;
    }
    for (let k = stack.length - 1; k >= 0; k--) {
      if (stack[k].name === t.name) {
        stack.length = k;
        break;
      }
    }
  }
  return stack;
}

/**
 * Split markdown source into plain markdown and lifted tags whose names are in
 * `tags`. A tag is lifted only when its opening tag starts a line (block
 * level) and a matching closing tag exists; same-name nesting is balanced. An
 * unclosed tag stays in the markdown, where it is sanitised like any HTML.
 */
export function splitMarkdownBlocks(src: string, tags: string[]): MarkdownBlock[] {
  const names = tags.map((t) => t.toLowerCase());
  if (names.length === 0) return src ? [{ type: "markdown", source: src }] : [];

  const { tokens } = scan(src, names, true);
  const blocks: MarkdownBlock[] = [];
  let cursor = 0;
  let i = 0;

  while (i < tokens.length) {
    const open = tokens[i];
    if (open.kind !== "open" || !open.lineStart || open.start < cursor) {
      i++;
      continue;
    }
    let depth = 0;
    let closeIdx = -1;
    for (let j = i; j < tokens.length; j++) {
      const t = tokens[j];
      if (t.name !== open.name) continue;
      depth += t.kind === "open" ? 1 : -1;
      if (depth === 0) {
        closeIdx = j;
        break;
      }
    }
    if (closeIdx < 0) {
      i++;
      continue;
    }
    const close = tokens[closeIdx];
    if (open.start > cursor) blocks.push({ type: "markdown", source: src.slice(cursor, open.start) });
    blocks.push({ type: "tag", tag: open.name, attrs: open.attrs, body: src.slice(open.end, close.start) });
    cursor = close.end;
    i = closeIdx + 1;
  }

  if (cursor < src.length) blocks.push({ type: "markdown", source: src.slice(cursor) });
  return blocks;
}

/**
 * Where to cut a still-streaming source so nothing unfinished shows: an open
 * custom tag (from its opening tag), an open code fence (from its fence line),
 * or a partial tag at the very end (`<`, `</res`, `<result title="x`). Returns
 * `src.length` when everything present is complete.
 *
 * A `<` that cannot become a known tag (`a < b`, `a<b`) is prose and is never
 * held back. Unknown tags are never held back.
 */
export function streamingCut(src: string, tags: string[], markdown: boolean): number {
  const names = tags.map((t) => t.toLowerCase());
  const { tokens, openFenceStart } = scan(src, names, markdown);
  let cut = src.length;

  if (openFenceStart >= 0) cut = Math.min(cut, openFenceStart);

  const stack = openTagsBefore(tokens, cut);
  if (stack.length) cut = Math.min(cut, stack[0].start);

  // Only the last line can hold something still arriving.
  const lastLineStart = src.lastIndexOf("\n", cut - 1) + 1;
  const lastLine = src.slice(lastLineStart, cut);

  if (markdown && /^ {0,3}(`{1,2}|~{1,2})$/.test(lastLine)) {
    return Math.min(cut, lastLineStart);
  }

  const lt = partialTagAt(lastLine, names, markdown);
  if (lt >= 0) cut = Math.min(cut, lastLineStart + lt);

  return cut;
}

/** A still-streaming source made renderable as it fills (`streaming="progressive"`). */
export interface ProgressiveSource {
  /** The source with partial trailing markers held back and open blocks closed. */
  source: string;
  /**
   * A code fence was still open and has been closed here, so the LAST code
   * block in the rendered output is the one still arriving.
   */
  openFence: boolean;
}

/**
 * Progressive streaming: show an open block as it fills instead of holding it
 * back. What is still held back is only what cannot be rendered honestly yet:
 *
 * - a partial tag at the very end that could still become a registered one
 *   (`<`, `<result title="Do`, `</res`), exactly as `streamingCut` holds it;
 * - a fence opener line with no newline yet (its info string may be partial);
 * - a fence marker still arriving (a run of backticks or tildes shorter than a
 *   fence), whether it would open or close one.
 *
 * Then an open code fence is closed with its own marker, and every registered
 * tag still open is closed innermost first, so the normal pipeline renders the
 * body-so-far: lifted, converted, sanitised, with nested extensions, exactly
 * as the final render will once the real closing tags arrive.
 */
export function streamingProgressive(src: string, tags: string[], markdown: boolean): ProgressiveSource {
  const names = tags.map((t) => t.toLowerCase());
  const { tokens, openFenceStart, openFence } = scan(src, names, markdown);
  let cut = src.length;
  let fence = openFenceStart >= 0 ? openFence : null;

  const lastLineStart = src.lastIndexOf("\n", cut - 1) + 1;
  const lastLine = src.slice(lastLineStart);

  if (fence) {
    if (openFenceStart === lastLineStart) {
      // The opener itself is still arriving: hold it, there is no code yet.
      cut = openFenceStart;
      fence = null;
    } else {
      // Inside code `<` is just code, so no partial-tag check; only a closing
      // marker still arriving is held.
      const m = /^ {0,3}(`+|~+)$/.exec(lastLine);
      if (m && m[1][0] === fence.char && m[1].length < fence.len) cut = lastLineStart;
    }
  } else if (markdown && /^ {0,3}(`{1,2}|~{1,2})$/.test(lastLine)) {
    cut = lastLineStart;
  } else {
    const lt = partialTagAt(lastLine, names, markdown);
    if (lt >= 0) cut = lastLineStart + lt;
  }

  let out = src.slice(0, cut);
  if (fence) {
    out += (out.endsWith("\n") ? "" : "\n") + fence.char.repeat(fence.len) + "\n";
  }
  const stack = openTagsBefore(tokens, fence ? openFenceStart : cut);
  for (let k = stack.length - 1; k >= 0; k--) out += `</${stack[k].name}>`;

  return { source: out, openFence: fence !== null };
}

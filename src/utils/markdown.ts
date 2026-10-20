import { marked } from "marked";
import { sanitizeHtml, type SanitizeHtmlOptions } from "./sanitize";

/**
 * Parse markdown to HTML WITHOUT sanitising. Internal: ContentRenderer's
 * `unsafe` path needs the raw output; everything public goes through
 * {@link renderMarkdown}.
 */
export function markdownToRawHtml(markdown: string | null | undefined): string {
  // marked.parse throws on nullish input; treat missing content as empty.
  return marked.parse(markdown ?? "", { async: false }) as string;
}

/**
 * Render markdown (GitHub-flavoured) to sanitised HTML — the same parser and
 * output `ContentRenderer` uses, so a host never has to import the parser
 * itself.
 *
 * With no `sanitize` options the default blocklist of {@link sanitizeHtml} is
 * applied; pass allowlist options to keep only what you list:
 *
 * ```ts
 * renderMarkdown(md, { allowedTags: ["p", "strong", "a"], allowedAttributes: ["href"] })
 * ```
 */
export function renderMarkdown(
  markdown: string,
  sanitize?: SanitizeHtmlOptions,
): string {
  return sanitizeHtml(markdownToRawHtml(markdown), sanitize);
}

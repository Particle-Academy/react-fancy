// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderMarkdown, sanitizeHtml } from "../src";

/*
 * react-fancy#35. ContentRenderer parses markdown with its own copy of a parser;
 * a host that wanted the same HTML had to import that parser behind our back.
 * renderMarkdown is the public, sanitised way to get it.
 */
describe("renderMarkdown", () => {
  it("renders markdown to HTML", () => {
    const out = renderMarkdown("Some **bold** text\n\n- one\n- two");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<li>one</li>");
    expect(out).toContain("<ul>");
  });

  it("is sanitised by default", () => {
    const out = renderMarkdown("hi <script>bad()</script> [x](javascript:bad()) <b onclick=\"bad()\">b</b>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("onclick");
  });

  it("applies an allowlist when given one", () => {
    const md = "![pixel](https://x.test/p.png) and **b**";
    expect(renderMarkdown(md)).toContain("<img");
    const out = renderMarkdown(md, { allowedTags: ["p", "strong"] });
    expect(out).not.toContain("<img");
    expect(out).toContain("<strong>b</strong>");
    expect(out).toBe(sanitizeHtml(renderMarkdown(md), { allowedTags: ["p", "strong"] }));
  });

  it("treats nullish input as empty rather than throwing", () => {
    expect(renderMarkdown(undefined as unknown as string)).toBe("");
    expect(renderMarkdown(null as unknown as string)).toBe("");
  });
});

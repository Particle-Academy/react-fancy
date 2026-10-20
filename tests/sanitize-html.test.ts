// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../src/utils/sanitize";

/*
 * sanitizeHtml is what stands between a file or a user's HTML and the host page
 * (ContentRenderer, fancy-code's FileViewer). It had no test.
 *
 * Found rendering a real HTML file in FileViewer: the file's `<title>` survived,
 * and a `<title>` anywhere in the document retitles the host's tab, so any
 * HTML a user opened could rename the app it was opened in.
 */
describe("sanitizeHtml", () => {
  const page = `<!doctype html><html><head><title>Not your app</title><meta http-equiv="refresh" content="0;url=https://example.com"><style>body{display:none}</style><link rel="stylesheet" href="/x.css"><base href="https://example.com/"></head><body><h1 onclick="steal()">Hi</h1><script>steal()</script><a href="javascript:steal()">x</a><iframe src="/"></iframe><p>Body</p></body></html>`;

  it("drops the title, so a document cannot rename the host's tab", () => {
    expect(sanitizeHtml(page)).not.toContain("<title");
    expect(sanitizeHtml("<p>a</p><title>b</title>")).toBe("<p>a</p>");
  });

  it("drops what can run, restyle, redirect or re-base the host page", () => {
    const out = sanitizeHtml(page);
    for (const tag of ["<script", "<style", "<meta", "<link", "<base", "<iframe"]) {
      expect(out, tag).not.toContain(tag);
    }
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("javascript:");
  });

  it("keeps the content", () => {
    const out = sanitizeHtml(page);
    expect(out).toContain("<h1>Hi</h1>");
    expect(out).toContain("<p>Body</p>");
  });
});

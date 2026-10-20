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

  it("an undefined options argument is the blocklist, unchanged", () => {
    const html = `<p class="c" style="color:red" data-x="1"><img src="https://x.test/a.png"><a href="tel:1">t</a></p>`;
    expect(sanitizeHtml(html, undefined)).toBe(sanitizeHtml(html));
    // The blocklist keeps all of this; the allowlist below must not.
    expect(sanitizeHtml(html)).toContain("<img");
    expect(sanitizeHtml(html)).toContain('style="color:red"');
  });
});

/*
 * react-fancy#35. Chat prose needs an ALLOWLIST: the blocklist above keeps
 * <img> (a tracking pixel), style (an overlay drawn over the app), class and
 * tel:/data: links. In allowlist mode anything not listed is gone, and a few
 * things are gone even when listed, because listing them cannot be made safe.
 */
describe("sanitizeHtml allowlist mode", () => {
  const CHAT_PROSE = {
    allowedTags: [
      "p", "br", "strong", "em", "b", "i", "u", "s", "del", "sub", "sup", "a",
      "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code",
      "pre", "span", "div", "hr", "table", "caption", "thead", "tbody", "tfoot",
      "tr", "th", "td", "dl", "dt", "dd",
    ],
    allowedAttributes: ["href", "title", "colspan", "rowspan"],
    allowedSchemes: ["https:", "http:", "mailto:"],
    allowRelative: true,
  };

  it("removes tags that are not listed but keeps their text", () => {
    expect(sanitizeHtml("<p>a <img src=\"https://x.test/p.png\"> <mark>b</mark></p>", CHAT_PROSE))
      .toBe("<p>a  b</p>");
  });

  it("removes attributes that are not listed", () => {
    expect(
      sanitizeHtml(`<p class="c" style="position:fixed" data-x="1" aria-label="l" title="t">x</p>`, CHAT_PROSE),
    ).toBe(`<p title="t">x</p>`);
  });

  it("keeps listed schemes and same-site relative URLs, drops the rest", () => {
    const cases: Array<[string, boolean]> = [
      ["https://a.test/x", true],
      ["http://a.test/x", true],
      ["mailto:a@a.test", true],
      ["/x", true],
      ["#top", true],
      ["../x?y=1", true],
      ["//evil.test/x", false],
      ["/\\evil.test/x", false],
      ["tel:123", false],
      ["data:text/html,hi", false],
      ["ftp://a.test", false],
      ["java\tscript:alert(1)", false],
      [" javascript:alert(1)", false],
    ];
    for (const [href, kept] of cases) {
      const out = sanitizeHtml(`<a href="${href}">x</a>`, CHAT_PROSE);
      expect(out.includes("href="), href).toBe(kept);
    }
  });

  it("drops relative URLs when allowRelative is off (the default)", () => {
    const strict = { ...CHAT_PROSE, allowRelative: undefined };
    expect(sanitizeHtml(`<a href="/x">x</a>`, strict)).toBe("<a>x</a>");
    expect(sanitizeHtml(`<a href="https://a.test">x</a>`, strict)).toBe(`<a href="https://a.test">x</a>`);
  });

  it("never keeps event handlers, javascript: or srcdoc, even when listed", () => {
    const listed = {
      allowedTags: ["a", "p"],
      allowedAttributes: ["href", "onclick", "onmouseover", "srcdoc"],
      allowedSchemes: ["javascript:", "vbscript:", "https:"],
    };
    const out = sanitizeHtml(
      `<p onclick="x()" onmouseover="y()" srcdoc="z"><a href="javascript:x()">a</a><a href="VBScript:x">b</a></p>`,
      listed,
    );
    expect(out).toBe("<p><a>a</a><a>b</a></p>");
  });

  it("removes script, iframe, style, svg and friends WITH their content, even when listed", () => {
    const listed = {
      allowedTags: ["p", "script", "iframe", "style", "svg", "math", "template", "noscript", "form", "title", "object"],
    };
    const out = sanitizeHtml(
      `<p>keep</p><script>bad()</script><iframe src="https://a.test"></iframe><style>p{}</style><svg><a>s</a></svg><math><mi>m</mi></math><template>t</template><noscript>n</noscript><form>f</form><title>tt</title><object>o</object>`,
      listed,
    );
    expect(out).toBe("<p>keep</p>");
  });

  it("removes a forbidden tag nested inside a removed-but-unwrapped one", () => {
    expect(sanitizeHtml("<section><p>a</p><script>bad()</script></section>", { allowedTags: ["p"] }))
      .toBe("<p>a</p>");
  });

  it("removes comments", () => {
    expect(sanitizeHtml("<p>a<!-- hi --></p>", { allowedTags: ["p"] })).toBe("<p>a</p>");
  });

  it("an empty options object keeps only text", () => {
    expect(sanitizeHtml(`<p class="x"><b>a</b> &amp; b</p>`, {})).toBe("a &amp; b");
  });

  it("allowedAttributes can be per tag, with * for every tag and a trailing wildcard", () => {
    const opts = {
      allowedTags: ["a", "td", "span"],
      allowedAttributes: { "*": ["title"], td: ["colspan"], span: ["data-*"] },
      allowedSchemes: ["https:"],
    };
    expect(
      sanitizeHtml(`<a href="https://a.test" title="t" colspan="2">a</a><span data-k="1" class="c">s</span>`, opts),
    ).toBe(`<a title="t">a</a><span data-k="1">s</span>`);
  });

  it("matches tag, attribute and scheme names case-insensitively", () => {
    expect(
      sanitizeHtml(`<A HREF="HTTPS://a.test" TITLE="t">x</A>`, {
        allowedTags: ["A"],
        allowedAttributes: ["Href", "title"],
        allowedSchemes: ["HTTPS:"],
      }),
    ).toBe(`<a href="HTTPS://a.test" title="t">x</a>`);
  });
});

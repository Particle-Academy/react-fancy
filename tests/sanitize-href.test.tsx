// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Button } from "../src/components/Button";
import { ChatMessage } from "../src/components/ChatThread";
import { safeAttributes } from "../src/components/ContentRenderer/extensions";
import { sanitizeHref, sanitizeHtml } from "../src/utils/sanitize";

/*
 * Reported by Genie (5.71.3): `<Button href="blob:...">`, a URL from
 * `URL.createObjectURL` for an in-memory file, was refused by sanitizeHref
 * without a word. Button fell back to a plain <button> with no href and the
 * link was dead.
 *
 * Decided (5.72.0): ALLOW `blob:`, KEEP REFUSING `data:` (every media type),
 * keep refusing everything else not on the list, and warn once per distinct
 * href in development when a component drops one.
 */

const BLOB = "blob:https://app.example.com/550e8400-e29b-41d4-a716-446655440000";

function anchorOf(node: React.ReactElement): HTMLAnchorElement | null {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(node);
  return host.querySelector("a");
}

describe("sanitizeHref: blob:", () => {
  it("accepts a blob: URL from URL.createObjectURL", () => {
    expect(sanitizeHref(BLOB)).toBe(BLOB);
    expect(sanitizeHref("blob:http://localhost:5173/550e8400-e29b-41d4-a716-446655440000")).toBeDefined();
    // Opaque-origin documents (sandboxed iframes) mint `blob:null/<uuid>`.
    expect(sanitizeHref("blob:null/550e8400-e29b-41d4-a716-446655440000")).toBeDefined();
    // The scheme is case-insensitive, and surrounding whitespace is trimmed.
    expect(sanitizeHref("BLOB:HTTPS://app.example.com/x")).toBe("BLOB:HTTPS://app.example.com/x");
    expect(sanitizeHref(`  ${BLOB}\n`)).toBe(BLOB);
  });

  it("refuses blob: wrapped around anything that is not a real origin", () => {
    for (const href of [
      "blob:javascript:alert(1)",
      "blob:JaVaScRiPt:alert(1)",
      "blob:data:text/html,<script>alert(1)</script>",
      "blob:vbscript:msgbox(1)",
      "blob:",
      "blob:x",
      "blob://app.example.com/x",
      "blob:\thttps://app.example.com/x",
    ]) {
      expect(sanitizeHref(href), href).toBeUndefined();
    }
  });

  it("does not take blob: from inside the URL, only as its scheme", () => {
    expect(sanitizeHref("javascript:blob:https://app.example.com/x")).toBeUndefined();
    expect(sanitizeHref("data:text/html,blob:https://a.example.com/x")).toBeUndefined();
  });
});

describe("sanitizeHref: data: stays refused, by decision", () => {
  it("refuses data:text/html (navigable, the risky case)", () => {
    expect(sanitizeHref("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(sanitizeHref("DATA:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBeUndefined();
  });

  it("refuses data:image/png too: every media type", () => {
    expect(sanitizeHref("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")).toBeUndefined();
  });

  it("refuses data: on Button even with download", () => {
    const a = anchorOf(
      <Button href="data:image/png;base64,AAAA" download="x.png">
        Save
      </Button>,
    );
    expect(a).toBeNull();
  });
});

describe("sanitizeHref: existing refusals and obfuscation", () => {
  it("still refuses dangerous and unlisted schemes", () => {
    for (const href of [
      "javascript:alert(1)",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "chrome://settings",
      "intent://x#Intent;end",
      "ws://app.example.com",
    ]) {
      expect(sanitizeHref(href), href).toBeUndefined();
    }
  });

  it("refuses obfuscated javascript:", () => {
    for (const href of [
      "  javascript:alert(1)",
      "\n\tjavascript:alert(1)",
      "\u0001javascript:alert(1)",
      "\u0000javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "&#106;avascript:alert(1)",
      "javascript&colon;alert(1):",
    ]) {
      expect(sanitizeHref(href), JSON.stringify(href)).toBeUndefined();
    }
  });

  it("an entity or percent-encoded colon is a relative path, never a scheme", () => {
    // No literal colon, so no scheme: React sets the attribute verbatim (no
    // entity decoding) and a browser does not decode %3A in a scheme, so
    // these navigate to a path on the current site.
    expect(sanitizeHref("javascript&colon;alert(1)")).toBe("javascript&colon;alert(1)");
    expect(sanitizeHref("javascript%3Aalert(1)")).toBe("javascript%3Aalert(1)");
  });

  it("keeps what it already allowed", () => {
    for (const href of [
      "https://example.com",
      "http://example.com",
      "mailto:a@example.com",
      "tel:+15551234",
      "sms:+15551234",
      "ftp://example.com/f",
      "#top",
      "/docs",
      "./a",
      "../b",
      "page?x=1",
    ]) {
      expect(sanitizeHref(href), href).toBe(href);
    }
  });

  it("empty and missing hrefs are undefined", () => {
    expect(sanitizeHref(undefined)).toBeUndefined();
    expect(sanitizeHref(null)).toBeUndefined();
    expect(sanitizeHref("")).toBeUndefined();
    expect(sanitizeHref("   ")).toBeUndefined();
  });
});

describe("components that take a link: blob: works", () => {
  it("Button renders <a href=blob:...>", () => {
    const a = anchorOf(<Button href={BLOB}>Download</Button>);
    expect(a).not.toBeNull();
    expect(a!.getAttribute("href")).toBe(BLOB);
  });

  it("Button keeps <a download> with a blob: href", () => {
    const a = anchorOf(
      <Button href={BLOB} download="report.csv">
        Download
      </Button>,
    );
    expect(a!.getAttribute("download")).toBe("report.csv");
  });

  it("ChatMessage links a blob: attachment", () => {
    const a = anchorOf(
      <ChatMessage
        message={{
          id: "m",
          role: "user",
          content: "here",
          createdAt: "2026-11-01T10:00:00",
          attachments: [{ id: "f", name: "draft.txt", url: BLOB }],
        }}
      />,
    );
    expect(a!.getAttribute("href")).toBe(BLOB);
  });

  it("ContentRenderer extension attributes keep blob:, drop data:", () => {
    expect(safeAttributes({ href: BLOB, src: "data:image/png;base64,AAAA" })).toEqual({ href: BLOB });
  });

  it("sanitizeHtml (default mode) keeps blob: and drops data:", () => {
    const out = sanitizeHtml(`<a href="${BLOB}">a</a><a href="data:text/html,x">b</a>`);
    expect(out).toContain(`href="${BLOB}"`);
    expect(out).not.toContain("data:");
  });
});

describe("dev warning when a component drops an href", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    vi.unstubAllEnvs();
  });

  it("warns once per distinct href, naming the component and the scheme", () => {
    const href = "data:text/html,<p>once-" + "x".repeat(200);
    renderToStaticMarkup(<Button href={href}>A</Button>);
    renderToStaticMarkup(<Button href={href}>A</Button>);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain("Button");
    expect(message).toContain("data:");
    // Not the whole URL: it may be long or carry a secret.
    expect(message).not.toContain("x".repeat(40));

    renderToStaticMarkup(<Button href={href + "-other"}>A</Button>);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("names ChatMessage for a dropped attachment url", () => {
    renderToStaticMarkup(
      <ChatMessage
        message={{
          id: "m",
          role: "user",
          content: "",
          createdAt: "2026-11-01T10:00:00",
          attachments: [{ id: "f", name: "evil", url: "javascript:chat-warn()" }],
        }}
      />,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("ChatMessage");
    expect(String(warn.mock.calls[0][0])).toContain("javascript:");
  });

  it("does not warn in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    renderToStaticMarkup(<Button href="javascript:prod-only()">A</Button>);
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn for an accepted, empty or missing href", () => {
    renderToStaticMarkup(<Button href={BLOB}>A</Button>);
    renderToStaticMarkup(<Button href="https://example.com">A</Button>);
    renderToStaticMarkup(<Button href="">A</Button>);
    renderToStaticMarkup(<Button href="   ">A</Button>);
    renderToStaticMarkup(<Button>A</Button>);
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn when sanitising content: refusing hostile markup is the job", () => {
    sanitizeHtml(`<a href="javascript:content-warn()">x</a>`);
    safeAttributes({ href: "javascript:attr-warn()" });
    sanitizeHref("javascript:direct-call()");
    expect(warn).not.toHaveBeenCalled();
  });
});

// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

import { CodeBlock } from "../src/components/CodeBlock";

/**
 * Server rendering -- a separate FILE under the `node` environment on purpose
 * (see json-editor-ssr.test.tsx): under jsdom a stray `window` / `navigator`
 * read during render resolves happily and the test proves nothing. Node 21+
 * defines a global `navigator`, so it is removed explicitly.
 */
describe("CodeBlock renders on the server", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders with no window, document or navigator", () => {
    vi.stubGlobal("navigator", undefined);
    // The precondition that makes this file mean anything.
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    expect(typeof navigator).toBe("undefined");

    const html = renderToString(
      <CodeBlock code={"<p>a</p>\n<script>x()</script>"} language="html" title="index.html" showLineNumbers />,
    );

    expect(html).toMatch(/^<div[^>]*data-react-fancy-code-block=""/);
    expect(html).toContain("<pre");
    expect(html).toContain("data-react-fancy-code-block-copy");
    expect(html).toContain("index.html");
    // Escaped, not live.
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("&lt;");
    // Display only: nothing that accepts input.
    expect(html).not.toMatch(/<(input|select|textarea)\b/);
    expect(html).not.toMatch(/contenteditable/i);
  });
});

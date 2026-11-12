// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";

import { SkipLink } from "../src/components/SkipLink";

/**
 * A skip link belongs in the server HTML: it is the first thing a keyboard user
 * reaches, before hydration has run. Under the `node` environment a stray
 * `document` read during render throws instead of passing quietly.
 */
describe("SkipLink renders on the server", () => {
  it("renders the link with no DOM globals", () => {
    expect(typeof document).toBe("undefined");
    const html = renderToString(<SkipLink />);
    expect(html).toMatch(/^<a [^>]*href="#main"/);
    expect(html).toContain('data-skip-link=""');
    expect(html).toContain('data-react-fancy-skip-link=""');
    expect(html).toContain(">Skip to content</a>");
  });
});

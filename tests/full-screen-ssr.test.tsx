// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";

import { FullScreen } from "../src/components/FullScreen";
import { Editor } from "../src/components/Editor/Editor";

/**
 * Server rendering — a separate FILE under the `node` environment on purpose
 * (see json-editor-ssr.test.tsx): under jsdom a stray `window`/`document` read
 * during render resolves happily and the test proves nothing.
 */
describe("FullScreen renders on the server", () => {
  it("renders the surface and the toggle inactive", () => {
    // The precondition that makes this file mean anything.
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const html = renderToString(
      <FullScreen>
        <FullScreen.Toggle />
        body
      </FullScreen>,
    );
    expect(html).toContain("data-react-fancy-fullscreen");
    expect(html).toContain('data-fullscreen="false"');
    expect(html).toContain("data-react-fancy-fullscreen-toggle");
  });

  it("renders an initially-active surface as the overlay without touching window", () => {
    const html = renderToString(
      <FullScreen defaultFullScreen mode="native">
        body
      </FullScreen>,
    );
    expect(html).toContain('data-fullscreen="true"');
    expect(html).toContain('data-fullscreen-mode="overlay"');
    expect(html).toContain("position:fixed");
  });

  it("renders an Editor with the full-screen toggle", () => {
    const html = renderToString(
      <Editor defaultValue="<p>x</p>" fullScreen>
        <Editor.Toolbar showFullScreenToggle />
        <Editor.Content />
      </Editor>,
    );
    expect(html).toContain("data-react-fancy-editor-fullscreen-toggle");
    expect(html).toContain('data-fullscreen="true"');
  });
});

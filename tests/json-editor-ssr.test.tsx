// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";

import { JsonEditor } from "../src/components/JsonEditor/JsonEditor";

/**
 * Server rendering — a separate FILE, not a case in the jsdom suite.
 *
 * That separation is the whole point. Under `@vitest-environment jsdom` a
 * `window` reference during render resolves happily, so a "does it SSR?" test
 * written there passes against a component that would throw on a real server —
 * which is the exact failure this kit has already paid for once. Only the
 * `node` environment, where there is no `window` to find, actually asks the
 * question.
 */
describe("JsonEditor renders on the server", () => {
  it("produces markup with no DOM available", () => {
    const html = renderToString(
      <JsonEditor
        value={{ user: { name: "Ada" }, tags: ["a"], age: 36, active: true }}
        keyMap='{"user.name":"string","age":"number","active":"boolean"}'
        mode="edit"
      />,
    );

    expect(html).toContain("data-react-fancy-json-editor");
    expect(html).toContain('data-path="user.name"');
    expect(html).toContain('data-path="tags.0"');
  });

  it("renders the issues panel server-side, so a bad keyMap is visible on first paint", () => {
    const html = renderToString(<JsonEditor value={{ age: 30 }} keyMap="{not json" />);

    expect(html).toContain('data-keymap-error="true"');
    expect(html).toContain("data-react-fancy-json-editor-issues");
  });
});

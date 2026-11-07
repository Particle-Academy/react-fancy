// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";

import { SetupWizard } from "../src/components/SetupWizard";

/**
 * Server rendering -- a separate FILE under the `node` environment on purpose
 * (see stepper-ssr.test.tsx): under jsdom a stray `window` read during render
 * resolves happily and the test proves nothing.
 */
describe("SetupWizard renders on the server", () => {
  it("renders the step, the badge, the link and the copy controls with no DOM globals", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const html = renderToString(
      <SetupWizard
        id="setup"
        steps={[
          {
            id: "key",
            title: "Copy your key",
            detail: "Open {{where}}.",
            url: "https://dashboard.example.com",
            copy: [{ label: "URL", value: "{{appUrl}}" }],
            done: "the key shows",
          },
          { title: "Agent", detail: "d", actor: "agent", prompt: "p" },
        ]}
        tokens={{ where: "Settings", appUrl: "https://app.example.com" }}
        verify={async () => ({ ok: true, detail: "ok" })}
        value={{ current: 0, done: [] }}
        onChange={() => {}}
      />,
    );

    expect(html).toContain('data-setup-step="key"');
    expect(html).toContain('role="region"');
    expect(html).toContain("Copy your key");
    expect(html).toContain("Open Settings.");
    expect(html).toContain('data-setup-actor="person"');
    expect(html).toContain('href="https://dashboard.example.com"');
    expect(html).toContain("https://app.example.com");
    expect(html).toContain("data-setup-copy=");
    expect(html).toContain("data-setup-live");
  });
});

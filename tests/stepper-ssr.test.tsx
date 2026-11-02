// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";

import { Stepper } from "../src/components/Stepper";

/**
 * Server rendering -- a separate FILE under the `node` environment on purpose
 * (see json-editor-ssr.test.tsx): under jsdom a stray `window`/`document` read
 * during render resolves happily and the test proves nothing.
 */
describe("Stepper renders on the server", () => {
  const steps = [
    { title: "Create an account", description: "At the provider", content: "Sign up first." },
    { title: "Copy the API key", state: "error" as const },
    { title: "Paste it here" },
  ];

  it("renders the list, states and aria-current with no DOM globals", () => {
    // The precondition that makes this file mean anything.
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const html = renderToString(<Stepper steps={steps} defaultCurrent={1} aria-label="Setup" />);

    expect(html).toMatch(/^<ol[^>]*data-react-fancy-stepper=""/);
    expect(html).toContain('data-state="complete"');
    expect(html).toContain('data-state="error"');
    expect(html).toContain('data-state="upcoming"');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Sign up first.");
    // Pure content: nothing interactive by default.
    expect(html).not.toMatch(/<(button|input|select|textarea|form)\b/);
  });

  it("renders clickable steps and compound children on the server too", () => {
    const html = renderToString(
      <Stepper clickable orientation="horizontal">
        <Stepper.Step title="One">body</Stepper.Step>
        <Stepper.Step title="Two" disabled />
      </Stepper>,
    );

    expect(html).toContain('data-orientation="horizontal"');
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html).toContain("disabled");
  });
});

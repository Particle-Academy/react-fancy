// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { ContentRenderer, type RenderExtension } from "../src/components/ContentRenderer";
import { mount } from "./content-renderer-helpers";

/**
 * `holdBack` and `transform` (CC-fancy-0042). A host with its own inline
 * grammar (pills like `[file:a.ts|label]`) used to mirror the renderer's
 * private partial-tag logic to stop a half-arrived pill flashing as raw text.
 * Now the host names its own cut and the renderer combines it with its own, so
 * streaming hold-back stays renderer-owned.
 */

const result: RenderExtension = {
  tag: "result",
  markdown: true,
  component: ({ children }) => <section data-card="">{children}</section>,
};

/** Cut at an unterminated `[kind:` pill, the way a host's grammar would. */
function pillHoldBack(text: string): number | null {
  const open = text.lastIndexOf("[");
  if (open < 0) return null;
  return text.indexOf("]", open) < 0 && /^\[[a-z]+:/.test(text.slice(open)) ? open : null;
}

/** Turn complete pills into their label, so the test can see them render. */
function pillTransform(text: string): string {
  return text.replace(/\[([a-z]+):([^|\]]+)\|([^\]]+)\]/g, "PILL($3)");
}

const STREAM = "Read [file:src/a.ts|the config] then\n\n<result>\nDone [agent:x|Ada] ok\n</result>\n\n```js\nconst b = 1;\n```\nend";

describe("ContentRenderer holdBack + transform", () => {
  it("never shows a partial host pill, a partial tag or an open fence, at EVERY prefix length", () => {
    for (const mode of [true, "progressive"] as const) {
      for (let n = 0; n <= STREAM.length; n++) {
        const prefix = STREAM.slice(0, n);
        const { host } = mount(
          <ContentRenderer
            value={prefix}
            format="markdown"
            extensions={[result]}
            streaming={mode}
            holdBack={pillHoldBack}
            transform={pillTransform}
          />,
        );
        const text = host.textContent ?? "";
        // A pill is either whole (transformed) or absent; its raw form never shows.
        expect(text, `mode ${String(mode)} prefix ${n}`).not.toMatch(/\[[a-z]+:/);
        expect(text, `mode ${String(mode)} prefix ${n}`).not.toContain("<");
        // `true` holds an open fence until its closing marker has arrived.
        const fenceClosed = n >= STREAM.indexOf("```\nend") + 3;
        if (mode === true && !fenceClosed) expect(text, `prefix ${n}`).not.toContain("const b");
      }
    }
  });

  it("renders everything, pills transformed, once streaming ends", () => {
    const { host } = mount(
      <ContentRenderer value={STREAM} format="markdown" extensions={[result]} holdBack={pillHoldBack} transform={pillTransform} />,
    );
    expect(host.textContent).toContain("PILL(the config)");
    expect(host.textContent).toContain("PILL(Ada)");
    expect(host.querySelector("[data-card]")).not.toBeNull();
  });

  it("holds the host's cut even where the renderer would show everything", () => {
    const { host } = mount(<ContentRenderer value="Open [file:src/a" format="markdown" streaming holdBack={pillHoldBack} />);
    expect(host.textContent).toContain("Open");
    expect(host.textContent).not.toContain("file:");
  });

  it("uses the renderer's cut where it is earlier than the host's", () => {
    const { host } = mount(<ContentRenderer value={"Hi\n\n<result>\nbody"} format="markdown" extensions={[result]} streaming holdBack={() => null} />);
    expect(host.textContent).toContain("Hi");
    expect(host.textContent).not.toContain("body");
  });

  it("does not call holdBack when not streaming, and ignores an out-of-range cut", () => {
    const holdBack = vi.fn(() => 2);
    mount(<ContentRenderer value="Hello" format="markdown" holdBack={holdBack} />);
    expect(holdBack).not.toHaveBeenCalled();
    const { host } = mount(<ContentRenderer value="Hello" format="markdown" streaming holdBack={() => 99} />);
    expect(host.textContent).toContain("Hello");
    const neg = mount(<ContentRenderer value="Hello" format="markdown" streaming holdBack={() => -1} />);
    expect(neg.host.textContent).toContain("Hello");
  });

  it("passes streaming to transform", () => {
    const transform = vi.fn((t: string) => t);
    mount(<ContentRenderer value="a" format="markdown" streaming transform={transform} />);
    mount(<ContentRenderer value="b" format="markdown" transform={transform} />);
    expect(transform).toHaveBeenCalledWith("a", { streaming: true });
    expect(transform).toHaveBeenCalledWith("b", { streaming: false });
  });
});

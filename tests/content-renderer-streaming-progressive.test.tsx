// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ContentRenderer, type RenderExtension } from "../src/components/ContentRenderer";
import { copyButtons, mount } from "./content-renderer-helpers";

/**
 * `streaming="progressive"` shows an open block as it fills, instead of
 * holding it back until it closes (genie, after 5.67.0). A PARTIAL opening tag
 * is still held, so `<result title="Do` never flashes raw.
 */

const result: RenderExtension = {
  tag: "result",
  markdown: true,
  component: ({ attributes, children }) => (
    <section data-card="" data-title={attributes.title}>
      {children}
    </section>
  ),
};

type Mode = boolean | "progressive";

function el(value: string, streaming: Mode) {
  return <ContentRenderer value={value} format="markdown" extensions={[result]} streaming={streaming} />;
}

function show(value: string, streaming: Mode = "progressive") {
  return mount(el(value, streaming));
}

describe("ContentRenderer progressive streaming", () => {
  it("renders an open tag's body-so-far as markdown inside its component", () => {
    const { host } = show('Hi\n\n<result title="Build">\n**partial** and `x`');
    const card = host.querySelector("[data-card]");
    expect(card).not.toBeNull();
    expect(card!.getAttribute("data-title")).toBe("Build");
    expect(card!.querySelector("strong")!.textContent).toBe("partial");
    expect(card!.querySelector("code")!.textContent).toBe("x");
    expect(host.textContent).not.toContain("<result");
  });

  it("renders an open code fence as a code block of what has arrived", () => {
    const { host } = show("Text\n\n```js\nconst a = 1;\nconst b");
    const pre = host.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toBe("const a = 1;\nconst b\n");
    expect(pre!.querySelector("code")!.className).toContain("language-js");
    expect(host.textContent).not.toContain("```");
  });

  it("renders an open fence inside an open tag body", () => {
    const { host } = show("<result>\nSee:\n\n```\nline one\nline");
    const card = host.querySelector("[data-card]")!;
    expect(card.querySelector("pre")!.textContent).toBe("line one\nline\n");
  });

  it("still holds back a partial opening tag", () => {
    for (const tail of ["<", "<r", "<res", "<result", '<result title="Do']) {
      const { host } = show("Hello\n\n" + tail);
      expect(host.textContent).toContain("Hello");
      expect(host.textContent).not.toContain("<");
      expect(host.textContent).not.toContain("title");
      expect(host.querySelector("[data-card]")).toBeNull();
    }
  });

  it("holds back a partial closing tag but keeps the body showing", () => {
    for (const tail of ["</", "</res", "</result"]) {
      const { host } = show("<result>\nbody\n" + tail);
      expect(host.querySelector("[data-card]")!.textContent).toContain("body");
      expect(host.textContent).not.toContain("</");
    }
  });

  it("holds back a fence opener line and a closing fence marker that are still arriving", () => {
    const opener = show("Text\n\n```ja");
    expect(opener.host.textContent).not.toContain("```");
    expect(opener.host.textContent).not.toContain("ja");

    const closer = show("```\ncode\n``");
    expect(closer.host.querySelector("pre")!.textContent).toBe("code\n");
    expect(closer.host.textContent).not.toContain("``");
  });

  it("does not treat a < inside an open fence as a partial tag", () => {
    const { host } = show("```\nif a <res");
    expect(host.querySelector("pre")!.textContent).toBe("if a <res\n");
  });

  it("sanitises the in-progress body", () => {
    const { host } = show(
      '<result>\nok <img src="x" onerror="alert(1)"> <a href="javascript:alert(1)">l</a>\n<script>alert(2)</script>',
    );
    const card = host.querySelector("[data-card]")!;
    expect(card.textContent).toContain("ok");
    expect(host.querySelector("script")).toBeNull();
    expect(host.querySelector("[onerror]")).toBeNull();
    const link = card.querySelector("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href") ?? "").not.toMatch(/javascript/i);
    expect(card.querySelector("img")).not.toBeNull();
  });

  it("hides the copy button on an in-progress fence until it closes", () => {
    const { host, rerender } = show("```\ndone\n```\n\n```\nstill");
    expect(host.querySelectorAll("pre")).toHaveLength(2);
    // The finished block keeps its button; the open one has none yet.
    expect(copyButtons(host, "code")).toHaveLength(1);
    expect(host.querySelectorAll("pre")[1].closest("[data-react-fancy-content-copy-block]")).toBeNull();

    rerender(el("```\ndone\n```\n\n```\nstill going\n```", "progressive"));
    expect(copyButtons(host, "code")).toHaveLength(2);
  });

  it("hides the in-progress fence's button inside an open tag body", () => {
    const { host } = show("<result>\n```\nopen");
    expect(host.querySelector("[data-card] pre")).not.toBeNull();
    expect(copyButtons(host, "code")).toHaveLength(0);
  });

  it("transitions to the final render when the stream ends", () => {
    const partial = '<result title="T">\n**a**\n\n```\nx';
    const final = partial + "\ny\n```\n</result>\n\nafter";
    const { host, rerender } = show(partial);
    expect(host.querySelector("[data-card] strong")!.textContent).toBe("a");
    expect(host.querySelector("[data-card] pre")!.textContent).toBe("x\n");

    rerender(el(final, false));
    const card = host.querySelector("[data-card]")!;
    expect(card.getAttribute("data-title")).toBe("T");
    expect(card.querySelector("strong")!.textContent).toBe("a");
    expect(card.querySelector("pre")!.textContent).toBe("x\ny\n");
    expect(copyButtons(host, "code")).toHaveLength(1);
    expect(host.textContent).toContain("after");
    expect(host.querySelector("[data-react-fancy-content-renderer]")!.hasAttribute("data-streaming")).toBe(false);
  });

  it("marks the root with the streaming mode", () => {
    const { host } = show("hi");
    const root = host.querySelector("[data-react-fancy-content-renderer]")!;
    expect(root.getAttribute("data-streaming")).toBe("true");
    expect(root.getAttribute("data-streaming-mode")).toBe("progressive");
  });

  it("leaves default streaming={true} holding open blocks back, unchanged", () => {
    const tag = show("Hi\n\n<result>\n**partial", true);
    expect(tag.host.querySelector("[data-card]")).toBeNull();
    expect(tag.host.textContent).not.toContain("partial");

    const fence = show("Text\n\n```js\nconst a", true);
    expect(fence.host.querySelector("pre")).toBeNull();
    expect(fence.host.textContent).not.toContain("const a");

    const root = fence.host.querySelector("[data-react-fancy-content-renderer]")!;
    expect(root.getAttribute("data-streaming")).toBe("true");
    expect(root.hasAttribute("data-streaming-mode")).toBe(false);
  });
});

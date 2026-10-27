// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ContentRenderer, type RenderExtension } from "../src/components/ContentRenderer";
import { mount } from "./content-renderer-helpers";

/**
 * `streaming` holds back an unfinished trailing custom tag or code fence, so a
 * half-arrived `<result` never flashes on screen as raw text (genie#1263).
 */

const result: RenderExtension = {
  tag: "result",
  markdown: true,
  component: ({ children }) => <section data-card="">{children}</section>,
};

function show(value: string, streaming = true) {
  return mount(
    <ContentRenderer value={value} format="markdown" extensions={[result]} streaming={streaming} />,
  );
}

describe("ContentRenderer streaming", () => {
  it("marks the root while streaming", () => {
    const { host } = show("hi");
    expect(host.querySelector("[data-react-fancy-content-renderer]")!.getAttribute("data-streaming")).toBe("true");
  });

  it("holds back a partial opening tag", () => {
    for (const tail of ["<", "<r", "<res", "<result", "<result title=\"Do"]) {
      const { host } = show("Hello\n\n" + tail);
      expect(host.textContent).toContain("Hello");
      expect(host.textContent).not.toContain("<");
      expect(host.textContent).not.toContain("title");
    }
  });

  it("holds back an opened tag whose body is still arriving", () => {
    const { host } = show("Hi\n\n<result>\n**partial");
    expect(host.textContent).toContain("Hi");
    expect(host.textContent).not.toContain("partial");
    expect(host.textContent).not.toContain("<result");
    expect(host.querySelector("[data-card]")).toBeNull();
  });

  it("holds back a partial closing tag", () => {
    for (const tail of ["</", "</res", "</result"]) {
      const { host } = show("Hi\n\n<result>\nbody\n" + tail);
      expect(host.textContent).toContain("Hi");
      expect(host.textContent).not.toContain("body");
      expect(host.textContent).not.toContain("</");
      expect(host.querySelector("[data-card]")).toBeNull();
    }
  });

  it("holds back an open code fence", () => {
    const { host } = show("Text\n\n```js\nconst a");
    expect(host.textContent).toContain("Text");
    expect(host.textContent).not.toContain("const a");
    expect(host.querySelector("pre")).toBeNull();
  });

  it("holds back a fence marker that is still arriving", () => {
    const { host } = show("Text\n\n``");
    expect(host.textContent).not.toContain("``");
  });

  it("renders a stray < in prose that is not a tag", () => {
    // A tag name that is not a prefix of a known tag is prose, even at the end.
    for (const text of ["if a < b then c", "1 <2 and 3 <= 4", "a<b", "x < y < z"]) {
      const { host } = show(text);
      expect(host.textContent!.trim()).toBe(text);
    }
    const { host } = show("use `<result` in code");
    expect(host.querySelector("code")!.textContent).toBe("<result");
  });

  it("does not hold back an unknown tag", () => {
    const { host } = show("a <b>bold</b> and <bogus");
    expect(host.querySelector("b")!.textContent).toBe("bold");
  });

  it("renders a finished block while still streaming", () => {
    const { host } = show("<result>\n**ok**\n</result>\n\nmore");
    expect(host.querySelector("[data-card] strong")!.textContent).toBe("ok");
    expect(host.textContent).toContain("more");
  });

  it("renders everything once streaming ends", () => {
    const { host, rerender } = show("Text\n\n```js\nconst a");
    expect(host.querySelector("pre")).toBeNull();
    rerender(<ContentRenderer value={"Text\n\n```js\nconst a"} format="markdown" extensions={[result]} />);
    expect(host.querySelector("pre")!.textContent).toContain("const a");

    const second = show("Hi\n\n<res");
    second.rerender(<ContentRenderer value={"Hi\n\n<res"} format="markdown" extensions={[result]} streaming={false} />);
    expect(second.host.textContent).toContain("<res");
  });
});

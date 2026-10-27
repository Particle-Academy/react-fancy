// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { ContentRenderer } from "../src/components/ContentRenderer";
import { click, copyButtons, fakeClipboard, liveRegion, mount } from "./content-renderer-helpers";

/**
 * Copy buttons on fenced code blocks and tables (genie#1263).
 *
 * The copied text is the contract: code copies EXACTLY what was between the
 * fences, and a table copies as TSV so it pastes into a spreadsheet as cells.
 */

const CODE = "Intro\n\n```ts\nconst a = 1;\nconst b = 2;\n```\n";
const TABLE = "| A | B |\n|---|---|\n| 1 | 2 |\n| x y | z |\n";

describe("ContentRenderer copy buttons", () => {
  it("gives a fenced code block a react-fancy Button with a stable handle", () => {
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" />);
    const [btn] = copyButtons(host, "code");
    expect(btn).toBeTruthy();
    expect(btn.hasAttribute("data-react-fancy-button")).toBe(true);
    expect(btn.querySelector("[data-react-fancy-icon]")).toBeTruthy();
    expect(btn.getAttribute("aria-label")).toBe("Copy code");
    expect(btn.getAttribute("data-copy-state")).toBe("idle");
  });

  it("copies the code exactly: no language label, no added trailing newline", async () => {
    const { writeText } = fakeClipboard();
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" />);
    await click(copyButtons(host, "code")[0]);
    expect(writeText).toHaveBeenCalledWith("const a = 1;\nconst b = 2;");
  });

  it("keeps indentation, blank lines and characters the HTML escapes", async () => {
    const { writeText } = fakeClipboard();
    const { host } = mount(<ContentRenderer value={"```html\n  <b>&amp;</b>\n\n\tx\n```"} format="markdown" />);
    await click(copyButtons(host, "code")[0]);
    expect(writeText).toHaveBeenCalledWith("  <b>&amp;</b>\n\n\tx");
  });

  it("does not strip a newline from code that arrived as HTML", async () => {
    const { writeText } = fakeClipboard();
    const { host } = mount(<ContentRenderer value={"<pre><code>a\n</code></pre>"} format="html" />);
    await click(copyButtons(host, "code")[0]);
    expect(writeText).toHaveBeenCalledWith("a\n");
  });

  it("does not put the button's own text into the copied code", async () => {
    const { writeText } = fakeClipboard();
    const { host } = mount(<ContentRenderer value={"```\nx\n```"} format="markdown" />);
    expect(host.querySelector("pre")!.contains(copyButtons(host, "code")[0])).toBe(false);
    await click(copyButtons(host, "code")[0]);
    expect(writeText).toHaveBeenCalledWith("x");
  });

  it("copies a table as TSV", async () => {
    const { writeText } = fakeClipboard();
    const { host } = mount(<ContentRenderer value={TABLE} format="markdown" />);
    const [btn] = copyButtons(host, "table");
    expect(btn.getAttribute("aria-label")).toBe("Copy table");
    await click(btn);
    expect(writeText).toHaveBeenCalledWith("A\tB\n1\t2\nx y\tz");
  });

  it("flattens tabs and newlines inside a cell so the TSV keeps its shape", async () => {
    const { writeText } = fakeClipboard();
    const html = "<table><tr><td>a\tb</td><td>c<br>d\ne</td></tr></table>";
    const { host } = mount(<ContentRenderer value={html} format="html" />);
    await click(copyButtons(host, "table")[0]);
    expect(writeText).toHaveBeenCalledWith("a b\tc d e");
  });

  it("shows check feedback and announces Copied in a live region", async () => {
    fakeClipboard();
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" />);
    const live = liveRegion(host)!;
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toBe("");
    const btn = copyButtons(host, "code")[0];
    await click(btn);
    expect(btn.getAttribute("data-copy-state")).toBe("copied");
    expect(btn.getAttribute("aria-label")).toBe("Copied");
    expect(live.textContent).toBe("Copied");
  });

  it("is opt-out with copyButtons={false}", () => {
    const { host } = mount(<ContentRenderer value={CODE + "\n" + TABLE} format="markdown" copyButtons={false} />);
    expect(copyButtons(host)).toHaveLength(0);
    expect(liveRegion(host)).toBeNull();
  });

  it("can opt out per kind", () => {
    const { host } = mount(
      <ContentRenderer value={CODE + "\n" + TABLE} format="markdown" copyButtons={{ table: false }} />,
    );
    expect(copyButtons(host, "code")).toHaveLength(1);
    expect(copyButtons(host, "table")).toHaveLength(0);
  });

  it("adds buttons to code nested in a list, and re-attaches them when the value changes", () => {
    const { host, rerender } = mount(<ContentRenderer value={"- item\n\n  ```\n  x\n  ```\n"} format="markdown" />);
    expect(copyButtons(host, "code")).toHaveLength(1);
    rerender(<ContentRenderer value={"```\na\n```\n\n```\nb\n```\n"} format="markdown" />);
    expect(copyButtons(host, "code")).toHaveLength(2);
    expect(host.querySelectorAll("pre")).toHaveLength(2);
  });

  it("reports a copy through onCopy so a host or agent can observe it", async () => {
    fakeClipboard();
    const onCopy = vi.fn();
    const { host } = mount(<ContentRenderer value={CODE + "\n" + TABLE} format="markdown" onCopy={onCopy} />);
    await click(copyButtons(host, "table")[0]);
    expect(onCopy).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "table", index: 1, text: "A\tB\n1\t2\nx y\tz", ok: true }),
    );
  });
});

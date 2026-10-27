// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { Editor } from "../src/components/Editor";
import { click, copyButtons, fakeClipboard, mount } from "./content-renderer-helpers";

/**
 * Editor's view mode renders through ContentRenderer, which shows copy buttons
 * by default. A host must be able to route those copies (`clipboardWriter`),
 * observe them (`onCopy`) and turn them off (`copyButtons`) from Editor, the
 * same way it can on ContentRenderer (genie, after 5.67.0).
 */

const DOC = "Intro\n\n```\nconst a = 1;\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n";

function view(props: Record<string, unknown> = {}) {
  return mount(
    <Editor value={DOC} valueFormat="markdown" outputFormat="markdown" mode="view" {...props}>
      <Editor.Content />
    </Editor>,
  );
}

describe("Editor view mode copy props", () => {
  it("keeps the copy-button default when no copy props are passed", () => {
    const { host } = view();
    expect(copyButtons(host, "code")).toHaveLength(1);
    expect(copyButtons(host, "table")).toHaveLength(1);
  });

  it("copyButtons={false} renders no copy buttons", () => {
    const { host } = view({ copyButtons: false });
    expect(host.querySelector("pre")).not.toBeNull();
    expect(copyButtons(host)).toHaveLength(0);
  });

  it("copyButtons={{ table: false }} keeps code buttons only", () => {
    const { host } = view({ copyButtons: { table: false } });
    expect(copyButtons(host, "code")).toHaveLength(1);
    expect(copyButtons(host, "table")).toHaveLength(0);
  });

  it("a clipboardWriter passed to Editor receives the copy", async () => {
    const { writeText } = fakeClipboard();
    const writer = vi.fn(async () => {});
    const { host } = view({ clipboardWriter: writer });
    await click(copyButtons(host, "code")[0]);
    expect(writeText).not.toHaveBeenCalled();
    expect(writer).toHaveBeenCalledTimes(1);
    const [payload] = writer.mock.calls[0] as unknown as [{ kind: string; text: string }];
    expect(payload.kind).toBe("code");
    expect(payload.text).toBe("const a = 1;");
  });

  it("onCopy fires from Editor", async () => {
    fakeClipboard();
    const onCopy = vi.fn();
    const { host } = view({ onCopy });
    await click(copyButtons(host, "table")[0]);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy.mock.calls[0][0]).toMatchObject({ kind: "table", text: "A\tB\n1\t2", ok: true, index: 1 });
  });
});

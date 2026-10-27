// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { ContentRenderer } from "../src/components/ContentRenderer";
import { click, copyButtons, fakeClipboard, liveRegion, mount, removeClipboard } from "./content-renderer-helpers";

/**
 * Clipboard writer + rich copy (genie#1263).
 *
 * Genie found `navigator.clipboard` can fail silently in a sandboxed Electron
 * window, so a host may supply its own writer. The default writes text/html AND
 * text/plain, falling back to plain text. A failed copy is never silent.
 */

const CODE = "```\nx\n```";
const TABLE = "| A | B |\n|---|---|\n| 1 | 2 |\n";

class FakeClipboardItem {
  constructor(public items: Record<string, Blob>) {}
  get types() {
    return Object.keys(this.items);
  }
}

describe("ContentRenderer clipboard", () => {
  it("uses a host-supplied clipboard writer instead of navigator.clipboard", async () => {
    const { writeText } = fakeClipboard();
    const writer = vi.fn(async () => {});
    const { host } = mount(<ContentRenderer value={TABLE} format="markdown" clipboardWriter={writer} />);
    await click(copyButtons(host, "table")[0]);
    expect(writeText).not.toHaveBeenCalled();
    expect(writer).toHaveBeenCalledTimes(1);
    const [payload] = writer.mock.calls[0] as unknown as [{ text: string; html: string; kind: string }];
    expect(payload.kind).toBe("table");
    expect(payload.text).toBe("A\tB\n1\t2");
    expect(payload.html).toMatch(/^<table[\s>]/);
    expect(liveRegion(host)!.textContent).toBe("Copied");
  });

  it("writes text/html and text/plain by default when ClipboardItem exists", async () => {
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const { write, writeText } = fakeClipboard({ write: true });
    const { host } = mount(<ContentRenderer value={TABLE} format="markdown" />);
    await click(copyButtons(host, "table")[0]);
    expect(writeText).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
    const [items] = write.mock.calls[0] as unknown as [FakeClipboardItem[]];
    expect(items).toHaveLength(1);
    expect(items[0].types.sort()).toEqual(["text/html", "text/plain"]);
    expect(await items[0].items["text/plain"].text()).toBe("A\tB\n1\t2");
    expect(await items[0].items["text/html"].text()).toContain("<table");
  });

  it("falls back to writeText when the rich write fails", async () => {
    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const { write, writeText } = fakeClipboard({ write: true, writeFails: true });
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" />);
    await click(copyButtons(host, "code")[0]);
    expect(write).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith("x");
    expect(liveRegion(host)!.textContent).toBe("Copied");
  });

  it("falls back to writeText when ClipboardItem is missing", async () => {
    const { writeText } = fakeClipboard({ write: true });
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" />);
    await click(copyButtons(host, "code")[0]);
    expect(writeText).toHaveBeenCalledWith("x");
  });

  it("announces a failed copy instead of failing silently", async () => {
    fakeClipboard({ writeTextFails: true });
    const onCopy = vi.fn();
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" onCopy={onCopy} />);
    const btn = copyButtons(host, "code")[0];
    await click(btn);
    expect(liveRegion(host)!.textContent).toBe("Copy failed");
    expect(btn.getAttribute("data-copy-state")).toBe("failed");
    expect(onCopy).toHaveBeenCalledWith(expect.objectContaining({ kind: "code", ok: false }));
  });

  it("announces a failure when there is no clipboard API at all", async () => {
    removeClipboard();
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" />);
    await click(copyButtons(host, "code")[0]);
    expect(liveRegion(host)!.textContent).toBe("Copy failed");
  });

  it("announces a failure when the host writer throws or returns false", async () => {
    const throws = mount(
      <ContentRenderer value={CODE} format="markdown" clipboardWriter={() => { throw new Error("no"); }} />,
    );
    await click(copyButtons(throws.host, "code")[0]);
    expect(liveRegion(throws.host)!.textContent).toBe("Copy failed");

    const refuses = mount(<ContentRenderer value={CODE} format="markdown" clipboardWriter={() => false} />);
    await click(copyButtons(refuses.host, "code")[0]);
    expect(liveRegion(refuses.host)!.textContent).toBe("Copy failed");
  });
});

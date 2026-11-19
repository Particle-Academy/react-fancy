// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { PromptInput, type PromptAttachment } from "../src/components/PromptInput/PromptInput";
import type { PromptDraft } from "../src/components/PromptInput/prompt-draft";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function file(name: string, type: string, size: number): File {
  const f = new File(["x".repeat(Math.max(size, 1))], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

/** jsdom has no DataTransfer, so hand React the shape its handler reads. */
function dragEvent(host: HTMLElement, type: "dragover" | "drop", files: File[]) {
  const target = host.querySelector("[data-react-fancy-prompt-input]")!;
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", { value: { files }, writable: false });
  act(() => {
    target.dispatchEvent(ev);
  });
  return ev;
}

function paste(host: HTMLElement, files: File[], text = "") {
  const ta = host.querySelector("textarea") as HTMLTextAreaElement;
  const ev = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: {
      files,
      types: [...(text ? ["text/plain"] : []), ...(files.length ? ["Files"] : [])],
      getData: (type: string) => (type === "text/plain" ? text : ""),
    },
    writable: false,
  });
  act(() => {
    ta.dispatchEvent(ev);
  });
  return ev;
}

function type(host: HTMLElement, value: string) {
  const ta = host.querySelector("textarea") as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setter.call(ta, value);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function submitVia(host: HTMLElement) {
  const ta = host.querySelector("textarea") as HTMLTextAreaElement;
  act(() => {
    ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
  });
}

/**
 * CC-fancy-0043: attachments are optional.
 *
 * A host whose backend cannot take files had no way to say so: the composer
 * always offered an Attach button, took drops and attached pasted files, and a
 * person could attach something that the send then silently discarded.
 * `attachments={false}` removes every way in, not just the button.
 */
describe("PromptInput attachments={false}", () => {
  it("renders no Attach button and no hidden file input", () => {
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} attachments={false} onSubmit={() => {}} />,
    );

    expect(host.querySelector("[data-react-fancy-prompt-input-attach]")).toBeNull();
    expect(host.querySelector('input[type="file"]')).toBeNull();

    unmount();
  });

  it("is not a drop target", () => {
    let got: PromptAttachment[] | null = null;
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} attachments={false} onSubmit={(_t, a) => (got = a)} />,
    );

    const over = dragEvent(host, "dragover", [file("a.pdf", "application/pdf", 10)]);
    // Not preventing dragover is what tells the browser this is no drop target.
    expect(over.defaultPrevented).toBe(false);
    const root = host.querySelector("[data-react-fancy-prompt-input]")!;
    expect(root.getAttribute("data-react-fancy-prompt-input-drag")).toBe("idle");

    const drop = dragEvent(host, "drop", [file("a.pdf", "application/pdf", 10)]);
    expect(drop.defaultPrevented).toBe(false);
    expect(host.textContent).not.toContain("a.pdf");

    type(host, "hello");
    submitVia(host);
    expect(got).toEqual([]);

    unmount();
  });

  it("does not attach a pasted file, and leaves the paste to the browser", () => {
    let got: PromptAttachment[] | null = null;
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} attachments={false} onSubmit={(_t, a) => (got = a)} />,
    );

    const ev = paste(host, [file("image.png", "image/png", 512)]);

    expect(ev.defaultPrevented).toBe(false);
    expect(host.querySelector('[aria-label="Remove attachment"]')).toBeNull();

    type(host, "hello");
    submitVia(host);
    expect(got).toEqual([]);

    unmount();
  });

  it("keeps the draft's attachments empty, even for a draft that arrives with some", () => {
    const drafts: PromptDraft[] = [];
    let got: PromptAttachment[] | null = null;
    const restored: PromptDraft = {
      v: 1,
      text: "restored",
      pills: [],
      attachments: [{ id: "f1", name: "old.pdf", type: "application/pdf", bytes: 3 }],
    };
    const { host, unmount } = mount(
      <PromptInput
        budgetTokens={1000}
        attachments={false}
        defaultDraft={restored}
        onDraftChange={(d) => drafts.push(d)}
        onSubmit={(_t, a) => (got = a)}
      />,
    );

    expect(host.textContent).not.toContain("old.pdf");

    dragEvent(host, "drop", [file("a.pdf", "application/pdf", 10)]);
    paste(host, [file("image.png", "image/png", 512)]);
    type(host, "restored and edited");

    expect(drafts.length).toBeGreaterThan(0);
    for (const d of drafts) expect(d.attachments).toEqual([]);

    submitVia(host);
    expect(got).toEqual([]);

    unmount();
  });

  it("still accepts pasted text", () => {
    let gotText: string | null = null;
    let got: PromptAttachment[] | null = null;
    const { host, unmount } = mount(
      <PromptInput
        budgetTokens={1000}
        attachments={false}
        onSubmit={(t, a) => {
          gotText = t;
          got = a;
        }}
      />,
    );

    // A text paste carrying an image rendition (Word, Excel) is text either way.
    const ev = paste(host, [file("image.png", "image/png", 900)], "pasted words");

    // The browser inserts the text; the component must not swallow it.
    expect(ev.defaultPrevented).toBe(false);
    expect(host.querySelector('[aria-label="Remove attachment"]')).toBeNull();

    // jsdom does not perform the insertion, so do what the browser would.
    type(host, "pasted words");
    submitVia(host);
    expect(gotText).toBe("pasted words");
    expect(got).toEqual([]);

    unmount();
  });

  it("still attaches by default", () => {
    let got: PromptAttachment[] | null = null;
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} onSubmit={(_t, a) => (got = a)} />,
    );

    expect(host.querySelector("[data-react-fancy-prompt-input-attach]")).not.toBeNull();
    expect(host.querySelector('input[type="file"]')).not.toBeNull();

    const over = dragEvent(host, "dragover", [file("a.pdf", "application/pdf", 10)]);
    expect(over.defaultPrevented).toBe(true);
    const drop = dragEvent(host, "drop", [file("a.pdf", "application/pdf", 10)]);
    expect(drop.defaultPrevented).toBe(true);
    expect(host.querySelector('[data-react-fancy-prompt-input-attachment]')?.textContent).toContain("a.pdf");

    const ev = paste(host, [file("image.png", "image/png", 512)]);
    expect(ev.defaultPrevented).toBe(true);
    expect(host.querySelectorAll('[aria-label="Remove attachment"]')).toHaveLength(2);

    type(host, "hello");
    submitVia(host);
    expect(got!.map((a) => a.name)).toEqual(["a.pdf", "image.png"]);

    unmount();
  });

  it('attachments={false} wins over attachButton="icon"', () => {
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} attachments={false} attachButton="icon" onSubmit={() => {}} />,
    );

    expect(host.querySelector("[data-react-fancy-prompt-input-attach]")).toBeNull();
    expect(host.querySelector('input[type="file"]')).toBeNull();

    unmount();
  });

  it('attachButton="icon" is unchanged with attachments on', () => {
    // Explicit true and the default must render the same icon button.
    for (const props of [{ attachments: true }, {}]) {
      const { host, unmount } = mount(
        <PromptInput budgetTokens={1000} attachButton="icon" {...props} onSubmit={() => {}} />,
      );

      const button = host.querySelector("[data-react-fancy-prompt-input-attach]")!;
      expect(button).not.toBeNull();
      expect(button.getAttribute("aria-label")).toBe("Attach files");
      expect(button.textContent).not.toContain("attach");
      expect(host.querySelector('input[type="file"]')).not.toBeNull();

      unmount();
    }
  });
});

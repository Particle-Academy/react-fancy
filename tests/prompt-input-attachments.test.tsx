// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { PromptInput, type PromptAttachment } from "../src/components/PromptInput/PromptInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/** jsdom has no DataTransfer, so hand React the shape its handler reads. */
function dropFiles(host: HTMLElement, files: File[]) {
  // The component has no root data attribute; the outer div carries the
  // drag handlers.
  const target = host.firstElementChild!;
  const ev = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", { value: { files }, writable: false });
  act(() => {
    target.dispatchEvent(ev);
  });
}

function file(name: string, type: string, size: number): File {
  const f = new File(["x".repeat(Math.max(size, 1))], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

/**
 * PromptInput must hand back the actual File — issue #16.
 *
 * The component advertises drop-to-attach as a headline feature, renders the
 * chips correctly, and reports the right names and byte counts. It just threw
 * the `File` away, so a host could display an attachment and do nothing else
 * with it: no POST, no FormData, no send-to-model.
 *
 * That is the expensive shape of bug — the UI looks completely finished, so it
 * is only discovered when someone wires the upload up and finds there is
 * nothing to send, by which point the component has been built around. It was
 * reported from a real app where uploading the file IS the feature, and they
 * had to hand-roll a composer.
 *
 * There was no escape hatch either: attachments are internal state with no
 * `value`/`onChange` and no ref, so a host could not intercept the drop.
 */
describe("PromptInput keeps the File", () => {
  it("carries the File and its MIME type through onSubmit", () => {
    let got: PromptAttachment[] = [];
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} onSubmit={(_t, a) => (got = a)} />,
    );

    const pdf = file("handbook.pdf", "application/pdf", 2048);
    dropFiles(host, [pdf]);

    // Guard: if the drop never registered, the assertions below would fail for
    // a reason that has nothing to do with the bug.
    expect(host.textContent).toContain("handbook.pdf");

    const form = host.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      form.dispatchEvent(// Submit is Cmd/Ctrl+Enter -- plain Enter inserts a newline.
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    });

    expect(got).toHaveLength(1);
    expect(got[0]!.name).toBe("handbook.pdf");
    expect(got[0]!.bytes).toBe(2048);
    // The whole point of the issue.
    expect(got[0]!.file).toBe(pdf);
    // Hosts branch on MIME to decide whether a file can be sent natively.
    expect(got[0]!.type).toBe("application/pdf");

    unmount();
  });

  it("gives every attachment a distinct id", () => {
    // Was `${name}-${Date.now()}-${Math.random()}`. Two files of the same name
    // dropped in the same tick collide on everything but the random suffix.
    let got: PromptAttachment[] = [];
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} onSubmit={(_t, a) => (got = a)} />,
    );

    dropFiles(host, [file("a.txt", "text/plain", 1), file("a.txt", "text/plain", 1)]);

    const ta = host.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      ta.dispatchEvent(// Submit is Cmd/Ctrl+Enter -- plain Enter inserts a newline.
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    });

    expect(got).toHaveLength(2);
    expect(new Set(got.map((a) => a.id)).size).toBe(2);

    unmount();
  });
});

/**
 * jsdom has no ClipboardEvent or DataTransfer either. `text` is what
 * `getData("text/plain")` answers, which is how a real clipboard tells a text
 * paste from an image one.
 */
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

function submitVia(host: HTMLElement) {
  const ta = host.querySelector("textarea") as HTMLTextAreaElement;
  act(() => {
    ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
  });
}

/**
 * Pasting a screenshot is how most people share an image with a chat.
 *
 * The composer took drops and the picker but had no paste handler at all, so a
 * pasted screenshot did nothing — no chip, no error. A host that replaced its
 * own paste-capable textarea with PromptInput lost the feature without noticing.
 */
describe("PromptInput attaches pasted images", () => {
  it("attaches a pasted screenshot with the File intact", () => {
    let got: PromptAttachment[] = [];
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} onSubmit={(_t, a) => (got = a)} />,
    );

    const shot = file("image.png", "image/png", 5120);
    const ev = paste(host, [shot]);

    expect(host.textContent).toContain("image.png");
    // Nothing for the browser to insert, and nothing half-inserted either.
    expect(ev.defaultPrevented).toBe(true);

    submitVia(host);

    expect(got).toHaveLength(1);
    expect(got[0]!.file).toBe(shot);
    expect(got[0]!.type).toBe("image/png");

    unmount();
  });

  it("leaves an ordinary text paste alone", () => {
    const { host, unmount } = mount(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);

    const ev = paste(host, [], "hello");

    // The browser inserts the text; the component must not swallow it.
    expect(ev.defaultPrevented).toBe(false);
    // No chip. (Not a search for the paperclip: the attach button has one.)
    expect(host.querySelector('[aria-label="Remove attachment"]')).toBeNull();

    unmount();
  });

  it("treats text copied with an image rendition as text", () => {
    // Word, Excel and most editors put a picture of the selection on the
    // clipboard beside the text. Attaching it would turn every paste of a
    // sentence into a screenshot of that sentence.
    const { host, unmount } = mount(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);

    const rendition = file("image.png", "image/png", 900);
    const ev = paste(host, [rendition], "Quarterly revenue rose 12%");

    expect(ev.defaultPrevented).toBe(false);
    expect(host.querySelector('[aria-label="Remove attachment"]')).toBeNull();

    unmount();
  });
});

describe("PromptInput can be attached to without a mouse", () => {
  it("exposes a real file input", () => {
    // Drop-only means keyboard and touch users cannot attach at all — an
    // accessibility gap, not just a convenience one.
    const { host, unmount } = mount(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);

    const input = host.querySelector('input[type="file"]') as HTMLInputElement | null;

    expect(input).not.toBeNull();
    expect(input!.multiple).toBe(true);

    unmount();
  });

  it("attaches files chosen through the picker, with the File intact", () => {
    let got: PromptAttachment[] = [];
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} onSubmit={(_t, a) => (got = a)} />,
    );

    const input = host.querySelector('input[type="file"]') as HTMLInputElement;
    const csv = file("bank.csv", "text/csv", 99);
    Object.defineProperty(input, "files", { value: [csv], writable: false });
    act(() => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const ta = host.querySelector("textarea") as HTMLTextAreaElement;
    act(() => {
      ta.dispatchEvent(// Submit is Cmd/Ctrl+Enter -- plain Enter inserts a newline.
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    });

    expect(got).toHaveLength(1);
    expect(got[0]!.file).toBe(csv);
    expect(got[0]!.name).toBe("bank.csv");

    unmount();
  });
});

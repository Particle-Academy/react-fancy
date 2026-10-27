// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createRef, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  PromptInput,
  type PromptAttachment,
  type PromptDraft,
  type PromptInputHandle,
  promptDataUrlToFile,
  promptFileToDataUrl,
} from "../src/components/PromptInput/PromptInput";
import { pasteMarker } from "../src/components/PastePills";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * PromptInput drafts — genie#1261.
 *
 * Genie keeps one PromptInput per agent chat so drafts do not leak between
 * chats, and could not survive a restart: the component had no `value`, no
 * `onChange` and no ref, so nothing outside it could read or set what was typed.
 * Controlled state is also the first line of the component contract, so this
 * closed a contract gap as well as a feature request.
 *
 * The hard requirement is the focus one (genie#1235): restoring a draft must
 * never focus the composer or move anybody's caret.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root: Root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
  };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  document.body.replaceChildren();
});

const WALL = "w".repeat(600);

function textarea(host: HTMLElement): HTMLTextAreaElement {
  return host.querySelector("textarea")!;
}

function editor(host: HTMLElement): HTMLElement {
  return host.querySelector("[data-react-fancy-composer-input]")!;
}

/** Type into the textarea the way React hears it: native setter, then `input`. */
function typeTextarea(host: HTMLElement, value: string) {
  const ta = textarea(host);
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setter.call(ta, value);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function caretAt(node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Type into the inline editor the way a browser does. */
function typeEditor(host: HTMLElement, text: string) {
  const el = editor(host);
  act(() => {
    const node = document.createTextNode(text);
    const last = el.lastChild;
    if (last instanceof HTMLElement && last.tagName === "BR") last.before(node);
    else el.append(node);
    caretAt(node, text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function pasteEditor(host: HTMLElement, data: { text?: string; files?: File[] }) {
  const ev = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: {
      getData: (t: string) => (t === "text/plain" ? (data.text ?? "") : ""),
      files: data.files ?? [],
    },
  });
  act(() => {
    editor(host).dispatchEvent(ev);
  });
}

function dropFiles(host: HTMLElement, files: File[]) {
  const target = host.querySelector("[data-react-fancy-prompt-input]")!;
  const ev = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", { value: { files }, writable: false });
  act(() => {
    target.dispatchEvent(ev);
  });
}

function submit(target: Element) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }),
    );
  });
}

const pdf = () => new File(["%PDF-1.7 handbook"], "handbook.pdf", { type: "application/pdf" });
const png = () => new File([new Uint8Array([137, 80, 78, 71])], "image.png", { type: "image/png" });

describe("PromptInput — controlled text", () => {
  it("shows `value` and reports typing through `onChange` without owning the text", () => {
    const onChange = vi.fn();
    const { host, rerender } = mount(
      <PromptInput budgetTokens={1000} value="hello" onChange={onChange} onSubmit={() => {}} />,
    );

    expect(textarea(host).value).toBe("hello");

    typeTextarea(host, "hello there");

    expect(onChange).toHaveBeenCalledWith("hello there");
    // Controlled: the parent did not take the change, so the text is the parent's.
    expect(textarea(host).value).toBe("hello");

    rerender(
      <PromptInput budgetTokens={1000} value="bye" onChange={onChange} onSubmit={() => {}} />,
    );
    expect(textarea(host).value).toBe("bye");
  });

  it("starts from `defaultValue` and then owns its own text", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} defaultValue="draft so far" onSubmit={() => {}} />,
    );

    expect(textarea(host).value).toBe("draft so far");

    typeTextarea(host, "draft so far, and more");
    expect(textarea(host).value).toBe("draft so far, and more");
  });
});

describe("PromptInput — whole drafts", () => {
  it("round-trips text, paste pills and attachments through JSON", () => {
    const first = createRef<PromptInputHandle>();
    const stored = new Map<string, File>();
    const persist = (file: File, entry: { id: string }) => {
      const key = `store:${entry.id}`;
      stored.set(key, file);
      return key;
    };

    const { host } = mount(
      <PromptInput
        ref={first}
        budgetTokens={100000}
        pasteThreshold={500}
        pasteImages
        persistAttachment={persist}
        onSubmit={() => {}}
      />,
    );

    typeEditor(host, "look at this");
    pasteEditor(host, { text: WALL });
    pasteEditor(host, { files: [png()] });
    dropFiles(host, [pdf()]);

    const draft = first.current!.getDraft();
    const json = JSON.stringify(draft);
    const saved = JSON.parse(json) as PromptDraft;

    expect(saved.v).toBe(1);
    expect(saved.text.startsWith("look at this\n")).toBe(true);
    expect(saved.pills).toHaveLength(2);
    const textPill = saved.pills.find((p) => p.kind === "text")!;
    const imagePill = saved.pills.find((p) => p.kind === "image")!;
    expect(textPill.kind === "text" && textPill.text).toBe(WALL);
    expect(imagePill.kind === "image" && imagePill.label).toBe("Pasted image 1");
    expect(imagePill.kind === "image" && imagePill.file).toMatchObject({
      name: "image.png",
      type: "image/png",
      bytes: 4,
      ref: `store:${imagePill.id}`,
    });
    expect(saved.attachments).toHaveLength(1);
    expect(saved.attachments[0]).toMatchObject({
      name: "handbook.pdf",
      type: "application/pdf",
      bytes: pdf().size,
    });
    expect(saved.attachments[0]!.ref).toBe(`store:${saved.attachments[0]!.id}`);
    // Nothing that JSON would have dropped or mangled.
    expect(JSON.parse(JSON.stringify(saved))).toEqual(draft);

    // A brand-new composer — what Genie has after a restart.
    mounted.pop()!();
    const second = createRef<PromptInputHandle>();
    let sentText = "";
    let sentFiles: PromptAttachment[] = [];
    const { host: host2 } = mount(
      <PromptInput
        ref={second}
        budgetTokens={100000}
        pasteThreshold={500}
        pasteImages
        restoreAttachment={(entry) => (entry.ref ? stored.get(entry.ref) : undefined)}
        onSubmit={(t, a) => {
          sentText = t;
          sentFiles = a;
        }}
      />,
    );

    act(() => second.current!.setDraft(saved));

    expect(second.current!.getDraft()).toEqual(saved);
    expect(editor(host2).querySelector("[data-react-fancy-composer-paste-pill]")?.textContent).toBe(
      "Pasted text · 600 characters",
    );
    expect(editor(host2).querySelector("[data-react-fancy-composer-image-pill]")).not.toBeNull();
    expect(
      host2.querySelector(`[data-react-fancy-prompt-input-attachment="${saved.attachments[0]!.id}"]`)
        ?.textContent,
    ).toContain("handbook.pdf");

    submit(editor(host2));

    expect(sentText).toBe(`look at this\n${WALL}\n[Pasted image 1]`);
    expect(sentFiles.map((a) => a.name).sort()).toEqual(["handbook.pdf", "image.png"]);
    // The restored attachments carry real Files again, from the host's store.
    for (const a of sentFiles) {
      expect(a.file).toBeInstanceOf(File);
      expect(a.file).toBe(stored.get(a.ref!));
    }
  });

  it("restores without a File when the host keeps none, and says so with `file: undefined`", () => {
    const handle = createRef<PromptInputHandle>();
    let sent: PromptAttachment[] = [];
    const { host } = mount(
      <PromptInput ref={handle} budgetTokens={1000} onSubmit={(_t, a) => (sent = a)} />,
    );

    act(() =>
      handle.current!.setDraft({
        v: 1,
        text: "see attached",
        pills: [],
        attachments: [{ id: "a1", name: "notes.txt", type: "text/plain", bytes: 12, ref: "srv:9" }],
      }),
    );

    expect(host.textContent).toContain("notes.txt");
    submit(textarea(host));
    expect(sent).toEqual([
      { id: "a1", name: "notes.txt", type: "text/plain", bytes: 12, ref: "srv:9", file: undefined },
    ]);
  });

  it("starts from `defaultDraft`", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={100000}
        pasteThreshold={500}
        defaultDraft={{
          v: 1,
          text: `before\n${pasteMarker("paste-1")}\nafter`,
          pills: [{ kind: "text", id: "paste-1", text: WALL }],
          attachments: [],
        }}
        onSubmit={() => {}}
      />,
    );

    expect(editor(host).querySelector("[data-react-fancy-composer-paste-pill]")).not.toBeNull();
    expect(editor(host).textContent).toContain("before");
  });

  it("is a controlled draft with `draft` + `onDraftChange`", () => {
    const onDraftChange = vi.fn();
    const draft: PromptDraft = { v: 1, text: "held by the parent", pills: [], attachments: [] };
    const { host } = mount(
      <PromptInput budgetTokens={1000} draft={draft} onDraftChange={onDraftChange} onSubmit={() => {}} />,
    );

    expect(textarea(host).value).toBe("held by the parent");

    typeTextarea(host, "held by the parent!");
    expect(onDraftChange).toHaveBeenLastCalledWith({ ...draft, text: "held by the parent!" });
    expect(textarea(host).value).toBe("held by the parent");
  });

  it("ignores a draft from a future schema rather than guessing at it", () => {
    const handle = createRef<PromptInputHandle>();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { host } = mount(
      <PromptInput ref={handle} budgetTokens={1000} defaultValue="mine" onSubmit={() => {}} />,
    );

    act(() =>
      handle.current!.setDraft({ v: 2, text: "from the future" } as unknown as PromptDraft),
    );

    expect(textarea(host).value).toBe("mine");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("PromptInput — attachment persistence", () => {
  it("records an async `persistAttachment` handle when it resolves, and reports it", async () => {
    const handle = createRef<PromptInputHandle>();
    const onDraftChange = vi.fn();
    let resolve!: (ref: string) => void;
    const { host } = mount(
      <PromptInput
        ref={handle}
        budgetTokens={1000}
        persistAttachment={() => new Promise<string>((r) => (resolve = r))}
        onDraftChange={onDraftChange}
        onSubmit={() => {}}
      />,
    );

    dropFiles(host, [pdf()]);
    expect(handle.current!.getDraft().attachments[0]!.ref).toBeUndefined();

    await act(async () => resolve("idb:42"));

    expect(handle.current!.getDraft().attachments[0]!.ref).toBe("idb:42");
    expect(onDraftChange.mock.lastCall![0].attachments[0].ref).toBe("idb:42");
  });

  it("promptFileToDataUrl and promptDataUrlToFile round-trip the bytes", async () => {
    const original = new File(["hello, draft"], "note.txt", { type: "text/plain" });
    const url = await promptFileToDataUrl(original);
    expect(url.startsWith("data:text/plain")).toBe(true);

    const back = promptDataUrlToFile(url, "note.txt", "text/plain")!;
    expect(back.name).toBe("note.txt");
    expect(back.type).toBe("text/plain");
    expect(await back.text()).toBe("hello, draft");
    expect(promptDataUrlToFile("idb:42", "x", "text/plain")).toBeUndefined();
  });
});

describe("PromptInput — restoring never steals focus (genie#1235)", () => {
  const draft: PromptDraft = {
    v: 1,
    text: `restored\n${pasteMarker("paste-1")}\n`,
    pills: [{ kind: "text", id: "paste-1", text: WALL }],
    attachments: [{ id: "a1", name: "notes.txt", type: "text/plain", bytes: 12 }],
  };

  for (const mode of ["textarea", "inline"] as const) {
    const extra = mode === "inline" ? { pasteThreshold: 500 } : {};

    it(`${mode}: leaves focus and the selection on another input`, () => {
      const other = document.createElement("input");
      other.value = "somewhere else";
      document.body.append(other);
      other.focus();
      other.setSelectionRange(3, 7);

      const handle = createRef<PromptInputHandle>();
      mount(<PromptInput ref={handle} budgetTokens={100000} {...extra} onSubmit={() => {}} />);

      act(() => handle.current!.setDraft(draft));

      expect(document.activeElement).toBe(other);
      expect([other.selectionStart, other.selectionEnd]).toEqual([3, 7]);
    });

    it(`${mode}: does not focus the composer or move the document selection when nothing has focus`, () => {
      const para = document.createElement("p");
      para.textContent = "a paragraph the reader selected";
      document.body.append(para);
      const range = document.createRange();
      range.setStart(para.firstChild!, 2);
      range.setEnd(para.firstChild!, 11);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);

      const handle = createRef<PromptInputHandle>();
      mount(<PromptInput ref={handle} budgetTokens={100000} {...extra} onSubmit={() => {}} />);
      const before = document.activeElement;

      act(() => handle.current!.setDraft(draft));

      expect(document.activeElement).toBe(before);
      expect(document.activeElement).toBe(document.body);
      const sel = window.getSelection()!;
      expect(sel.rangeCount).toBe(1);
      const now = sel.getRangeAt(0);
      expect([now.startContainer, now.startOffset, now.endContainer, now.endOffset]).toEqual([
        para.firstChild,
        2,
        para.firstChild,
        11,
      ]);
    });
  }

  it("focuses only when asked: setDraft(draft, { focus: true })", () => {
    const handle = createRef<PromptInputHandle>();
    const { host } = mount(<PromptInput ref={handle} budgetTokens={1000} onSubmit={() => {}} />);

    act(() => handle.current!.setDraft({ v: 1, text: "go", pills: [], attachments: [] }, { focus: true }));

    expect(document.activeElement).toBe(textarea(host));
  });
});

describe("PromptInput — a programmatic restore is not an edit", () => {
  it("setDraft fires neither onChange nor onDraftChange; typing fires both", () => {
    const onChange = vi.fn();
    const onDraftChange = vi.fn();
    const handle = createRef<PromptInputHandle>();
    const { host } = mount(
      <PromptInput
        ref={handle}
        budgetTokens={1000}
        onChange={onChange}
        onDraftChange={onDraftChange}
        onSubmit={() => {}}
      />,
    );

    act(() => handle.current!.setDraft({ v: 1, text: "restored", pills: [], attachments: [] }));

    expect(textarea(host).value).toBe("restored");
    expect(onChange).not.toHaveBeenCalled();
    expect(onDraftChange).not.toHaveBeenCalled();

    typeTextarea(host, "restored!");
    expect(onChange).toHaveBeenCalledWith("restored!");
    expect(onDraftChange).toHaveBeenCalledWith({
      v: 1,
      text: "restored!",
      pills: [],
      attachments: [],
    });
  });
});

/**
 * The snapshots were WRITTEN BY 5.64.1, before any of this existed, so a diff is
 * a change to what every existing consumer renders. One deliberate change since:
 * the textarea gained `data-react-fancy-prompt-input-textarea` (the contract's
 * stable handle; it had none), and nothing else moved. Icon SVGs are stripped: the
 * icon set loads asynchronously, so whether one has arrived depends on test
 * order, not on this component.
 */
function ownMarkup(host: HTMLElement): string {
  const copy = host.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("svg").forEach((svg) => svg.remove());
  return copy.innerHTML;
}

describe("PromptInput — existing usage is unchanged", () => {
  it("renders the same markup as 5.64.1 (textarea)", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} platform="generic" onSubmit={() => {}} />);
    expect(ownMarkup(host)).toMatchSnapshot();
  });

  it("renders the same markup as 5.64.1 (inline paste)", () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} platform="generic" pasteThreshold={500} pasteImages onSubmit={() => {}} />,
    );
    expect(ownMarkup(host)).toMatchSnapshot();
  });
});

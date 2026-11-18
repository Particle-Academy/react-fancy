// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "../src/components/Editor/Editor";
import { useEditor, type EditorContextValue } from "../src/components/Editor/Editor.context";
import { editorTokenHtml } from "../src/components/Editor/editor.tokens";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let ctx: EditorContextValue | null = null;
function Grab() {
  ctx = useEditor();
  return null;
}

const mounted: Array<() => void> = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!();
  ctx = null;
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return {
    host,
    content: () => host.querySelector<HTMLDivElement>('[contenteditable="true"]')!,
    chips: () => Array.from(host.querySelectorAll<HTMLElement>("[data-react-fancy-editor-token]")),
  };
}

function caretAt(node: Node, offset: number) {
  const sel = window.getSelection()!;
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function key(el: HTMLElement, k: string) {
  const ev = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true });
  act(() => {
    el.dispatchEvent(ev);
  });
  return ev;
}

const TOKEN = '<span data-react-fancy-editor-token="customer.name" contenteditable="false">Customer name</span>';

describe("Editor atomic inline token", () => {
  it("insertToken puts a non-editable chip with a stable handle at the caret and emits it", () => {
    const onChange = vi.fn();
    const view = mount(
      <Editor value="<p>Dear </p>" onChange={onChange} outputFormat="html">
        <Editor.Content />
        <Grab />
      </Editor>,
    );
    const p = view.content().querySelector("p")!;
    caretAt(p.firstChild!, 5);
    act(() => ctx!.insertToken({ id: "customer.name", label: "Customer name" }));

    const chips = view.chips();
    expect(chips).toHaveLength(1);
    expect(chips[0]!.getAttribute("data-react-fancy-editor-token")).toBe("customer.name");
    expect(chips[0]!.getAttribute("contenteditable")).toBe("false");
    expect(chips[0]!.textContent).toBe("Customer name");
    expect(chips[0]!.parentElement).toBe(p);
    const emitted = onChange.mock.calls.at(-1)![0] as string;
    expect(emitted).toContain('data-react-fancy-editor-token="customer.name"');
    expect(emitted.indexOf("Dear")).toBeLessThan(emitted.indexOf("customer.name"));
  });

  it("appends at the end when the caret is outside the editor", () => {
    const view = mount(
      <Editor value="<p>Hi</p>" onChange={() => {}} outputFormat="html">
        <Editor.Content />
        <Grab />
      </Editor>,
    );
    window.getSelection()!.removeAllRanges();
    act(() => ctx!.insertToken({ id: "a", label: "A" }));
    expect(view.chips()).toHaveLength(1);
    expect(view.content().textContent).toBe("HiA");
  });

  it("Backspace right after a chip removes the whole chip", () => {
    const onChange = vi.fn();
    const view = mount(
      <Editor value={`<p>Dear ${TOKEN}, thanks</p>`} onChange={onChange} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    const chip = view.chips()[0]!;
    caretAt(chip.nextSibling!, 0);
    const ev = key(view.content(), "Backspace");
    expect(ev.defaultPrevented).toBe(true);
    expect(view.chips()).toHaveLength(0);
    expect(view.content().textContent).toBe("Dear , thanks");
    expect(onChange.mock.calls.at(-1)![0]).not.toContain("customer.name");
  });

  it("Backspace with an element-offset caret after the chip removes it", () => {
    const view = mount(
      <Editor value={`<p>${TOKEN}</p>`} onChange={() => {}} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    const p = view.content().querySelector("p")!;
    caretAt(p, 1);
    key(view.content(), "Backspace");
    expect(view.chips()).toHaveLength(0);
  });

  it("Delete right before a chip removes the whole chip", () => {
    const view = mount(
      <Editor value={`<p>Dear ${TOKEN}</p>`} onChange={() => {}} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    const text = view.content().querySelector("p")!.firstChild!;
    caretAt(text, 5);
    const ev = key(view.content(), "Delete");
    expect(ev.defaultPrevented).toBe(true);
    expect(view.chips()).toHaveLength(0);
  });

  it("Backspace inside ordinary text is left to the browser", () => {
    const view = mount(
      <Editor value={`<p>Dear ${TOKEN}</p>`} onChange={() => {}} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    caretAt(view.content().querySelector("p")!.firstChild!, 3);
    const ev = key(view.content(), "Backspace");
    expect(ev.defaultPrevented).toBe(false);
    expect(view.chips()).toHaveLength(1);
  });

  it("the arrow keys step over a chip in one press", () => {
    const view = mount(
      <Editor value={`<p>Dear ${TOKEN}, thanks</p>`} onChange={() => {}} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    const chip = view.chips()[0]!;
    const p = chip.parentElement!;
    const index = Array.from(p.childNodes).indexOf(chip);

    caretAt(chip.nextSibling!, 0);
    expect(key(view.content(), "ArrowLeft").defaultPrevented).toBe(true);
    let r = window.getSelection()!.getRangeAt(0);
    expect(r.startContainer).toBe(p);
    expect(r.startOffset).toBe(index);

    caretAt(p.firstChild!, 5);
    expect(key(view.content(), "ArrowRight").defaultPrevented).toBe(true);
    r = window.getSelection()!.getRangeAt(0);
    expect(r.startContainer).toBe(p);
    expect(r.startOffset).toBe(index + 1);
  });

  it("marks seeded chips non-editable even when the value omitted it", () => {
    const view = mount(
      <Editor
        value={'<p><span data-react-fancy-editor-token="x">X</span></p>'}
        onChange={() => {}}
        outputFormat="html"
      >
        <Editor.Content />
      </Editor>,
    );
    expect(view.chips()[0]!.getAttribute("contenteditable")).toBe("false");
  });

  it("keeps a chip through markdown output as inline HTML", () => {
    const onChange = vi.fn();
    mount(
      <Editor value={`Dear ${TOKEN}`} onChange={onChange} outputFormat="markdown" valueFormat="markdown">
        <Editor.Content />
        <Grab />
      </Editor>,
    );
    act(() => ctx!.insertToken({ id: "b", label: "B" }));
    const md = onChange.mock.calls.at(-1)![0] as string;
    expect(md).toContain('data-react-fancy-editor-token="customer.name"');
    expect(md).toContain('data-react-fancy-editor-token="b"');
    expect(md.startsWith("Dear ")).toBe(true);
  });

  it("a label is text, never markup", () => {
    const view = mount(
      <Editor value="" onChange={() => {}} outputFormat="html">
        <Editor.Content />
        <Grab />
      </Editor>,
    );
    act(() => ctx!.insertToken({ id: 'a"b', label: "<img src=x onerror=alert(1)>" }));
    const chip = view.chips()[0]!;
    expect(chip.querySelector("img")).toBeNull();
    expect(chip.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(chip.getAttribute("data-react-fancy-editor-token")).toBe('a"b');
  });
});

describe("editorTokenHtml", () => {
  it("escapes the id and the label", () => {
    expect(editorTokenHtml({ id: 'a"<b', label: "<x>&" })).toBe(
      '<span data-react-fancy-editor-token="a&quot;&lt;b" contenteditable="false">&lt;x&gt;&amp;</span>',
    );
  });
});

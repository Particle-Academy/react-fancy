// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createRef, useImperativeHandle, useState, forwardRef, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import {
  PromptInput,
  type PromptDraft,
  type PromptInputHandle,
} from "../src/components/PromptInput/PromptInput";
import { Composer } from "../src/components/Composer/Composer";
import { pasteMarker, type HeldPaste } from "../src/components/PastePills";
import { useAcknowledgedSubmit, type SubmitResult } from "../src/hooks/use-acknowledged-submit";

/*
 * The acknowledged-submit contract, field by field and revision by revision.
 *
 * 5.70.0 kept the draft while a send was in flight and on failure, and cleared on
 * success only if "the draft still looked like what was sent". "Looked like" was a
 * comparison of the text and the ids of pills and attachments, so a NEWER draft
 * that happened to compare equal was thrown away: an edit typed and then undone,
 * a host `setDraft` that restored the same draft, a host that changed a pill's
 * content or an attachment under the same id. Clearing is now tied to the draft
 * REVISION that was sent: anything that changed the draft after the send (the
 * person, the host, a second send) makes it newer, and a newer draft is never
 * cleared by an older send.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  document.body.replaceChildren();
});

function deferred() {
  let resolve!: (v: SubmitResult) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<SubmitResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function settle(fn: () => void) {
  await act(async () => {
    fn();
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

const editorOf = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-composer-input]")!;
const textareaOf = (host: Element) => host.querySelector("textarea")!;

function typeTextarea(host: Element, value: string) {
  const ta = textareaOf(host);
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    set.call(ta, value);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Append typed text to the inline editor, the way a browser does. Returns the node, so it can be deleted again. */
function typeEditor(host: Element, text: string): Text {
  const el = editorOf(host);
  const node = document.createTextNode(text);
  act(() => {
    const last = el.lastChild;
    if (last instanceof HTMLElement && last.tagName === "BR") last.before(node);
    else el.append(node);
    caretAt(node, text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return node;
}

/** Backspace `suffix` off the end of the inline editor's last text node (the editor may have rebuilt its DOM). */
function backspaceEditor(host: Element, suffix: string) {
  const el = editorOf(host);
  act(() => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if ((n as Text).data.endsWith(suffix)) last = n as Text;
    }
    if (!last) throw new Error(`no text node ends with ${JSON.stringify(suffix)}`);
    last.data = last.data.slice(0, -suffix.length);
    caretAt(last, last.data.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function pasteInto(target: Element, data: { text?: string; files?: File[] }) {
  const ev = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: {
      getData: (t: string) => (t === "text/plain" || t === "text" ? (data.text ?? "") : ""),
      files: data.files ?? [],
    },
  });
  act(() => {
    target.dispatchEvent(ev);
  });
}

function caretToEnd(el: HTMLElement) {
  const last = el.lastChild;
  if (!last) return;
  if (last instanceof HTMLElement && last.tagName === "BR" && last.previousSibling) {
    const prev = last.previousSibling;
    if (prev.nodeType === Node.TEXT_NODE) caretAt(prev, prev.textContent!.length);
    return;
  }
  if (last.nodeType === Node.TEXT_NODE) caretAt(last, last.textContent!.length);
}

function dropFiles(host: Element, files: File[]) {
  const target = host.querySelector("[data-react-fancy-prompt-input]")!;
  const ev = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", { value: { files }, writable: false });
  act(() => {
    target.dispatchEvent(ev);
  });
}

function keydown(el: Element, init: KeyboardEventInit) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
  });
}

const WALL = "w".repeat(600);
const WALL2 = "z".repeat(700);
const pdf = () => new File(["%PDF-1.7"], "handbook.pdf", { type: "application/pdf" });
const png = () => new File([new Uint8Array([137, 80, 78, 71])], "shot2.png", { type: "image/png" });

const ATTACHMENT = { id: "a1", name: "notes.txt", type: "text/plain", bytes: 3, ref: "store://a1" };

/** Inline: text + a text pill + an image pill + an attachment, every file carrying a ref. */
const INLINE_DRAFT: PromptDraft = {
  v: 1,
  text: `look at ${pasteMarker("p1")} and ${pasteMarker("i1")}`,
  pills: [
    { kind: "text", id: "p1", text: WALL },
    {
      kind: "image",
      id: "i1",
      label: "Pasted image 1",
      file: { id: "i1", name: "shot.png", type: "image/png", bytes: 4, ref: "store://i1" },
    },
  ],
  attachments: [ATTACHMENT],
};

/** Textarea: no pills exist in this mode (a pill would be expanded into the text). */
const TEXTAREA_DRAFT: PromptDraft = {
  v: 1,
  text: "summarise this",
  pills: [],
  attachments: [ATTACHMENT],
};

const EMPTY: PromptDraft = { v: 1, text: "", pills: [], attachments: [] };

type Mode = "inline" | "textarea";

function mountPrompt(mode: Mode, onSubmit: () => Promise<SubmitResult>, onSubmitError?: (e: unknown) => void) {
  const ref = createRef<PromptInputHandle>();
  const host = mount(
    <PromptInput
      ref={ref}
      budgetTokens={100000}
      {...(mode === "inline" ? { pasteThreshold: 500, pasteImages: true } : {})}
      defaultDraft={mode === "inline" ? INLINE_DRAFT : TEXTAREA_DRAFT}
      onSubmit={onSubmit}
      onSubmitError={onSubmitError}
    />,
  );
  const field = () => (mode === "inline" ? editorOf(host) : textareaOf(host));
  const submit = () => keydown(field(), { key: "Enter", ctrlKey: true });
  const draft = () => ref.current!.getDraft();
  return { host, ref, field, submit, draft };
}

for (const mode of ["inline", "textarea"] as const) {
  describe(`PromptInput (${mode}) — whole-draft retention`, () => {
    it("the mounted draft carries every field, refs included", () => {
      const p = mountPrompt(mode, () => new Promise(() => {}));
      expect(p.draft()).toEqual(mode === "inline" ? INLINE_DRAFT : TEXTAREA_DRAFT);
    });

    it("pending keeps the whole draft", () => {
      const pending = deferred();
      const p = mountPrompt(mode, () => pending.promise);
      const before = p.draft();
      p.submit();
      expect(p.draft()).toEqual(before);
    });

    it("a rejection keeps the whole draft", async () => {
      const pending = deferred();
      const onError = vi.fn();
      const p = mountPrompt(mode, () => pending.promise, onError);
      const before = p.draft();
      p.submit();
      await settle(() => pending.reject(new Error("offline")));
      expect(p.draft()).toEqual(before);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("{ ok: false } keeps the whole draft", async () => {
      const pending = deferred();
      const p = mountPrompt(mode, () => pending.promise);
      const before = p.draft();
      p.submit();
      await settle(() => pending.resolve({ ok: false, error: "quota" }));
      expect(p.draft()).toEqual(before);
    });
  });

  describe(`PromptInput (${mode}) — revision-safe clearing`, () => {
    it("resolve clears exactly the submitted revision", async () => {
      const pending = deferred();
      const p = mountPrompt(mode, () => pending.promise);
      p.submit();
      await settle(() => pending.resolve());
      expect(p.draft()).toEqual(EMPTY);
    });

    it("typing during pending survives the resolve", async () => {
      const pending = deferred();
      const p = mountPrompt(mode, () => pending.promise);
      p.submit();
      if (mode === "inline") typeEditor(p.host, " more");
      else typeTextarea(p.host, "summarise this, and more");
      const typed = p.draft();
      expect(typed.text).toContain("more");
      await settle(() => pending.resolve());
      expect(p.draft()).toEqual(typed);
    });

    it("an edit made during pending and then undone still survives the resolve", async () => {
      const pending = deferred();
      const p = mountPrompt(mode, () => pending.promise);
      const before = p.draft();
      p.submit();
      if (mode === "inline") {
        typeEditor(p.host, "x");
        expect(p.draft().text.endsWith("x")).toBe(true);
        backspaceEditor(p.host, "x");
      } else {
        typeTextarea(p.host, "summarise this!");
        typeTextarea(p.host, "summarise this");
      }
      expect(p.draft()).toEqual(before);
      await settle(() => pending.resolve());
      // The person touched it after sending: the draft is theirs, not the send's.
      expect(p.draft()).toEqual(before);
    });

    it("a host setDraft with a different draft during pending survives the resolve", async () => {
      const pending = deferred();
      const p = mountPrompt(mode, () => pending.promise);
      p.submit();
      const next: PromptDraft = { v: 1, text: "from the host", pills: [], attachments: [] };
      act(() => p.ref.current!.setDraft(next));
      await settle(() => pending.resolve());
      expect(p.draft()).toEqual(next);
    });

    it("a host setDraft of the SAME draft during pending survives the resolve", async () => {
      const pending = deferred();
      const p = mountPrompt(mode, () => pending.promise);
      const before = p.draft();
      p.submit();
      act(() => p.ref.current!.setDraft(before));
      await settle(() => pending.resolve());
      expect(p.draft()).toEqual(before);
    });

    it("a host setDraft that changes an attachment under the same id survives the resolve", async () => {
      const pending = deferred();
      const p = mountPrompt(mode, () => pending.promise);
      p.submit();
      const next = p.draft();
      next.attachments = [{ ...ATTACHMENT, name: "renamed.txt", bytes: 9 }];
      act(() => p.ref.current!.setDraft(next));
      await settle(() => pending.resolve());
      expect(p.draft()).toEqual(next);
    });

    it("an attachment added during pending survives the resolve", async () => {
      const pending = deferred();
      const p = mountPrompt(mode, () => pending.promise);
      p.submit();
      dropFiles(p.host, [pdf()]);
      const withPdf = p.draft();
      expect(withPdf.attachments.map((a) => a.name)).toEqual(["notes.txt", "handbook.pdf"]);
      await settle(() => pending.resolve());
      expect(p.draft()).toEqual(withPdf);
    });

    it("a second send while one is pending is refused", () => {
      const pending = deferred();
      const onSubmit = vi.fn(() => pending.promise);
      const p = mountPrompt(mode, onSubmit);
      p.submit();
      p.submit();
      act(() => p.host.querySelector<HTMLButtonElement>("[data-react-fancy-prompt-input-send]")!.click());
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
}

describe("PromptInput (inline) — pills and pill content during pending", () => {
  it("a text pill pasted during pending survives the resolve", async () => {
    const pending = deferred();
    const p = mountPrompt("inline", () => pending.promise);
    p.submit();
    caretToEnd(editorOf(p.host));
    pasteInto(editorOf(p.host), { text: WALL2 });
    const withPill = p.draft();
    expect(withPill.pills.filter((x) => x.kind === "text")).toHaveLength(2);
    await settle(() => pending.resolve());
    expect(p.draft()).toEqual(withPill);
  });

  it("an image pill pasted during pending survives the resolve", async () => {
    const pending = deferred();
    const p = mountPrompt("inline", () => pending.promise);
    p.submit();
    caretToEnd(editorOf(p.host));
    pasteInto(editorOf(p.host), { files: [png()] });
    const withImage = p.draft();
    expect(withImage.pills.filter((x) => x.kind === "image")).toHaveLength(2);
    await settle(() => pending.resolve());
    expect(p.draft()).toEqual(withImage);
  });

  it("a host setDraft that changes a pill's content under the same id survives the resolve", async () => {
    const pending = deferred();
    const p = mountPrompt("inline", () => pending.promise);
    p.submit();
    const next = p.draft();
    next.pills = next.pills.map((x) => (x.kind === "text" ? { ...x, text: WALL2 } : x));
    act(() => p.ref.current!.setDraft(next));
    await settle(() => pending.resolve());
    expect(p.draft()).toEqual(next);
  });

  it("a controlled host that echoes a deep CLONE of each draft is still cleared on success", async () => {
    const pending = deferred();
    const ref = createRef<PromptInputHandle>();
    function Host() {
      const [draft, setDraft] = useState<PromptDraft>(INLINE_DRAFT);
      return (
        <PromptInput
          ref={ref}
          budgetTokens={100000}
          pasteThreshold={500}
          pasteImages
          draft={draft}
          onDraftChange={(d) => setDraft(JSON.parse(JSON.stringify(d)) as PromptDraft)}
          onSubmit={() => pending.promise}
        />
      );
    }
    const host = mount(<Host />);
    typeEditor(host, " please");
    keydown(editorOf(host), { key: "Enter", ctrlKey: true });
    await settle(() => pending.resolve());
    // An echo that says the same thing is not a newer draft.
    expect(ref.current!.getDraft()).toEqual(EMPTY);
  });

  it("a ref arriving from persistAttachment during pending does NOT block the clear", async () => {
    const pending = deferred();
    let storeResolve!: (ref: string) => void;
    const ref = createRef<PromptInputHandle>();
    const host = mount(
      <PromptInput
        ref={ref}
        budgetTokens={100000}
        persistAttachment={() => new Promise<string>((res) => (storeResolve = res))}
        onSubmit={() => pending.promise}
      />,
    );
    typeTextarea(host, "with a file");
    dropFiles(host, [pdf()]);
    keydown(textareaOf(host), { key: "Enter", ctrlKey: true });
    await settle(() => storeResolve("store://late"));
    expect(ref.current!.getDraft().attachments[0]!.ref).toBe("store://late");
    await settle(() => pending.resolve());
    // Storage catching up is not the person changing their message.
    expect(ref.current!.getDraft()).toEqual(EMPTY);
  });
});

/* ------------------------------------------------------------------------- */

type ComposerMode = "above" | "inline";

interface ComposerHostHandle {
  setValue(v: string): void;
  setHeldPastes(p: HeldPaste[]): void;
  value(): string;
  pastes(): HeldPaste[];
}

const ComposerHost = forwardRef<
  ComposerHostHandle,
  { mode: ComposerMode; onSubmit: () => Promise<SubmitResult>; onSubmitError?: (e: unknown) => void }
>(function ComposerHost({ mode, onSubmit, onSubmitError }, ref) {
  const [value, setValue] = useState("");
  const [held, setHeld] = useState<HeldPaste[]>([]);
  useImperativeHandle(ref, () => ({
    setValue,
    setHeldPastes: setHeld,
    value: () => value,
    pastes: () => held,
  }));
  return (
    <Composer
      pasteThreshold={500}
      pastePlacement={mode}
      {...(mode === "inline" ? { pasteImages: true } : {})}
      value={value}
      onChange={setValue}
      heldPastes={held}
      onHeldPastesChange={setHeld}
      onSubmit={onSubmit}
      onSubmitError={onSubmitError}
    />
  );
});

function mountComposer(mode: ComposerMode, onSubmit: () => Promise<SubmitResult>, onSubmitError?: (e: unknown) => void) {
  const ref = createRef<ComposerHostHandle>();
  const host = mount(<ComposerHost ref={ref} mode={mode} onSubmit={onSubmit} onSubmitError={onSubmitError} />);
  const field = () => (mode === "inline" ? editorOf(host) : textareaOf(host));
  const type = (text: string) => {
    if (mode === "inline") typeEditor(host, text);
    else typeTextarea(host, ref.current!.value() + text);
  };
  const pastePill = (text: string) => {
    if (mode === "inline") caretToEnd(editorOf(host));
    pasteInto(field(), { text });
  };
  const submit = () => keydown(field(), { key: "Enter" });
  const state = () => ({ value: ref.current!.value(), pastes: ref.current!.pastes() });
  return { host, ref, field, type, pastePill, submit, state };
}

for (const mode of ["above", "inline"] as const) {
  describe(`Composer (${mode}) — whole-draft retention and revision-safe clearing`, () => {
    function start(onSubmit: () => Promise<SubmitResult>, onError?: (e: unknown) => void) {
      const c = mountComposer(mode, onSubmit, onError);
      c.type("question");
      c.pastePill(WALL);
      expect(c.state().pastes).toHaveLength(1);
      return c;
    }

    it("pending keeps text and pills", () => {
      const pending = deferred();
      const c = start(() => pending.promise);
      const before = c.state();
      c.submit();
      expect(c.state()).toEqual(before);
    });

    it("a rejection keeps text and pills", async () => {
      const pending = deferred();
      const c = start(() => pending.promise, () => {});
      const before = c.state();
      c.submit();
      await settle(() => pending.reject(new Error("offline")));
      expect(c.state()).toEqual(before);
    });

    it("{ ok: false } keeps text and pills", async () => {
      const pending = deferred();
      const c = start(() => pending.promise);
      const before = c.state();
      c.submit();
      await settle(() => pending.resolve({ ok: false }));
      expect(c.state()).toEqual(before);
    });

    it("resolve clears exactly the submitted revision", async () => {
      const pending = deferred();
      const c = start(() => pending.promise);
      c.submit();
      await settle(() => pending.resolve());
      expect(c.state()).toEqual({ value: "", pastes: [] });
    });

    it("typing during pending survives the resolve", async () => {
      const pending = deferred();
      const c = start(() => pending.promise);
      c.submit();
      c.type(" more");
      const typed = c.state();
      await settle(() => pending.resolve());
      expect(c.state()).toEqual(typed);
    });

    it("an edit made during pending and then undone still survives the resolve", async () => {
      const pending = deferred();
      const c = start(() => pending.promise);
      const before = c.state();
      c.submit();
      c.type("!");
      expect(c.state().value.endsWith("!")).toBe(true);
      if (mode === "inline") backspaceEditor(c.host, "!");
      else typeTextarea(c.host, before.value);
      expect(c.state()).toEqual(before);
      await settle(() => pending.resolve());
      expect(c.state()).toEqual(before);
    });

    it("a host value change during pending survives the resolve", async () => {
      const pending = deferred();
      const c = start(() => pending.promise);
      c.submit();
      act(() => c.ref.current!.setValue("from the host"));
      const next = c.state();
      await settle(() => pending.resolve());
      expect(c.state()).toEqual(next);
    });

    it("a host change to a pill's content under the same id survives the resolve", async () => {
      const pending = deferred();
      const c = start(() => pending.promise);
      c.submit();
      act(() => c.ref.current!.setHeldPastes(c.state().pastes.map((p) => ({ ...p, text: WALL2 }))));
      const next = c.state();
      await settle(() => pending.resolve());
      expect(c.state()).toEqual(next);
    });

    it("a pill pasted during pending survives the resolve", async () => {
      const pending = deferred();
      const c = start(() => pending.promise);
      c.submit();
      c.pastePill(WALL2);
      const next = c.state();
      expect(next.pastes).toHaveLength(2);
      await settle(() => pending.resolve());
      expect(c.state()).toEqual(next);
    });

    it("a second send while one is pending is refused", () => {
      const pending = deferred();
      const onSubmit = vi.fn(() => pending.promise);
      const c = start(onSubmit);
      c.submit();
      c.submit();
      act(() => c.host.querySelector<HTMLButtonElement>("[data-react-fancy-composer-send]")!.click());
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
}

/* ------------------------------------------------------------------------- */

/*
 * Neither component lets a second send start while one is pending: the guard
 * reads a ref, so even two in the same tick are refused, and no prop turns it
 * off. These tests drive the shared hook directly, as a host that bypassed the
 * guard would, to pin what happens if two sends ever DO overlap: only the
 * newest send may acknowledge, and an older one settling changes nothing.
 */
describe("useAcknowledgedSubmit — overlapping sends", () => {
  type Hook = ReturnType<typeof useAcknowledgedSubmit>;
  function mountHook(onError?: (e: unknown) => void) {
    const box: { current: Hook | null } = { current: null };
    function Probe() {
      box.current = useAcknowledgedSubmit(onError);
      return <span data-status={box.current.status} />;
    }
    const host = mount(<Probe />);
    return { hook: () => box.current!, status: () => host.querySelector("span")!.getAttribute("data-status") };
  }

  it("an older send resolving does not acknowledge, and does not end the newer one", async () => {
    const h = mountHook();
    const first = deferred();
    const second = deferred();
    const acceptFirst = vi.fn();
    const acceptSecond = vi.fn();
    act(() => h.hook().track(first.promise, acceptFirst));
    act(() => h.hook().track(second.promise, acceptSecond));

    await settle(() => first.resolve());
    expect(acceptFirst).not.toHaveBeenCalled();
    expect(h.hook().busy()).toBe(true);
    expect(h.status()).toBe("submitting");

    await settle(() => second.resolve());
    expect(acceptSecond).toHaveBeenCalledTimes(1);
    expect(h.hook().busy()).toBe(false);
    expect(h.status()).toBe("idle");
  });

  it("an older send failing still reports the error, but leaves the newer one pending", async () => {
    const onError = vi.fn();
    const h = mountHook(onError);
    const first = deferred();
    const second = deferred();
    act(() => h.hook().track(first.promise, () => {}));
    act(() => h.hook().track(second.promise, () => {}));

    await settle(() => first.reject(new Error("old")));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(h.hook().busy()).toBe(true);
    expect(h.status()).toBe("submitting");
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { PromptInput, type PromptDraft } from "../src/components/PromptInput/PromptInput";
import type { SubmitResult } from "../src/components/PromptInput";

/*
 * An acknowledged send, plus a public `disabled` and a send-only disable.
 *
 * The draft used to reset on the line after `onSubmit`, so a send that failed
 * had already discarded the text AND the attachments by the time the host found
 * out. A Promise from `onSubmit` now holds the whole draft until it settles.
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

function typeInto(ta: HTMLTextAreaElement, text: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    set.call(ta, text);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function modEnter(el: Element) {
  act(() => {
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }),
    );
  });
}

async function settle(fn: () => void) {
  await act(async () => {
    fn();
  });
}

const WITH_ATTACHMENT: PromptDraft = {
  v: 1,
  text: "",
  pills: [],
  attachments: [{ id: "a1", name: "notes.txt", type: "text/plain", bytes: 3 }],
};

const rootEl = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-prompt-input]")!;
const textarea = (host: Element) => host.querySelector("textarea")!;
const send = (host: Element) => host.querySelector<HTMLButtonElement>("[data-react-fancy-prompt-input-send]")!;
const attachButton = (host: Element) => host.querySelector<HTMLButtonElement>("[data-react-fancy-prompt-input-attach]")!;
const chip = (host: Element) => host.querySelector("[data-react-fancy-prompt-input-attachment='a1']");
const errorRegion = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-prompt-input-error]");

describe("PromptInput — a Promise from onSubmit holds the draft until it is acknowledged", () => {
  it("keeps text and attachments, marks the send busy and blocks a second send while pending", () => {
    const pending = deferred();
    const onSubmit = vi.fn(() => pending.promise);
    const host = mount(<PromptInput budgetTokens={1000} defaultDraft={WITH_ATTACHMENT} onSubmit={onSubmit} />);

    typeInto(textarea(host), "summarise this");
    modEnter(textarea(host));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![1]).toHaveLength(1);
    expect(textarea(host).value).toBe("summarise this");
    expect(chip(host)).not.toBeNull();
    expect(send(host).disabled).toBe(true);
    expect(send(host).getAttribute("aria-busy")).toBe("true");
    expect(rootEl(host).getAttribute("data-submit-state")).toBe("submitting");
    expect(textarea(host).disabled).toBe(false);

    modEnter(textarea(host));
    act(() => send(host).click());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("empties the draft exactly as before once the Promise resolves", async () => {
    const pending = deferred();
    const drafts: PromptDraft[] = [];
    const host = mount(
      <PromptInput
        budgetTokens={1000}
        defaultDraft={WITH_ATTACHMENT}
        onDraftChange={(d) => drafts.push(d)}
        onSubmit={() => pending.promise}
      />,
    );

    typeInto(textarea(host), "summarise this");
    modEnter(textarea(host));
    const before = drafts.length;
    await settle(() => pending.resolve());

    expect(textarea(host).value).toBe("");
    expect(chip(host)).toBeNull();
    // One commit for the whole reset, as the synchronous path does.
    expect(drafts.slice(before)).toEqual([{ v: 1, text: "", pills: [], attachments: [] }]);
    expect(rootEl(host).hasAttribute("data-submit-state")).toBe(false);
  });

  it("keeps the draft and reports an { ok: false } result", async () => {
    const pending = deferred();
    const onSubmitError = vi.fn();
    const host = mount(
      <PromptInput
        budgetTokens={1000}
        defaultDraft={WITH_ATTACHMENT}
        onSubmit={() => pending.promise}
        onSubmitError={onSubmitError}
      />,
    );

    typeInto(textarea(host), "summarise this");
    modEnter(textarea(host));
    await settle(() => pending.resolve({ ok: false, error: "Quota exceeded" }));

    expect(textarea(host).value).toBe("summarise this");
    expect(chip(host)).not.toBeNull();
    expect(onSubmitError).toHaveBeenCalledWith("Quota exceeded");
    expect(rootEl(host).getAttribute("data-submit-state")).toBe("error");
    expect(send(host).disabled).toBe(false);
    const region = errorRegion(host)!;
    expect(region.getAttribute("role")).toBe("alert");
    expect(region.textContent).toContain("Quota exceeded");
    expect(region.style.position).toBe("absolute");
  });

  it("keeps the draft and reports a rejection", async () => {
    const pending = deferred();
    const onSubmitError = vi.fn();
    const host = mount(
      <PromptInput budgetTokens={1000} onSubmit={() => pending.promise} onSubmitError={onSubmitError} />,
    );

    typeInto(textarea(host), "hello");
    modEnter(textarea(host));
    const boom = new Error("offline");
    await settle(() => pending.reject(boom));

    expect(textarea(host).value).toBe("hello");
    expect(onSubmitError).toHaveBeenCalledWith(boom);
    expect(errorRegion(host)!.textContent).toMatch(/not sent/i);
  });

  it("does not throw away what the person typed while the send was in flight", async () => {
    const pending = deferred();
    const host = mount(<PromptInput budgetTokens={1000} onSubmit={() => pending.promise} />);

    typeInto(textarea(host), "hello");
    modEnter(textarea(host));
    typeInto(textarea(host), "hello, and also");
    await settle(() => pending.resolve());

    expect(textarea(host).value).toBe("hello, and also");
  });

  it("a controlled draft keeps authority: the reset arrives through onDraftChange", async () => {
    const pending = deferred();
    function Host() {
      const [draft, setDraft] = useState<PromptDraft>({ v: 1, text: "", pills: [], attachments: [] });
      return (
        <PromptInput budgetTokens={1000} draft={draft} onDraftChange={setDraft} onSubmit={() => pending.promise} />
      );
    }
    const host = mount(<Host />);

    typeInto(textarea(host), "hello");
    modEnter(textarea(host));
    expect(textarea(host).value).toBe("hello");
    await settle(() => pending.resolve());

    expect(textarea(host).value).toBe("");
  });
});

describe("PromptInput — disabled and sendDisabled", () => {
  it("disabled disables the text, attach and send, and Ctrl+Enter does nothing", () => {
    const onSubmit = vi.fn();
    const host = mount(
      <PromptInput budgetTokens={1000} defaultValue="hi" disabled onSubmit={onSubmit} />,
    );

    expect(textarea(host).disabled).toBe(true);
    expect(attachButton(host).disabled).toBe(true);
    expect(send(host).disabled).toBe(true);

    modEnter(textarea(host));
    act(() => send(host).click());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disabled also disables the inline editor", () => {
    const host = mount(<PromptInput budgetTokens={1000} pasteThreshold={500} disabled onSubmit={() => {}} />);
    const editor = host.querySelector<HTMLElement>("[data-react-fancy-composer-input]")!;
    expect(editor.getAttribute("contenteditable")).toBe("false");
  });

  it("sendDisabled disables only the send: the text stays editable", () => {
    const onSubmit = vi.fn();
    const host = mount(<PromptInput budgetTokens={1000} sendDisabled onSubmit={onSubmit} />);

    typeInto(textarea(host), "drafting");
    expect(textarea(host).disabled).toBe(false);
    expect(textarea(host).value).toBe("drafting");
    expect(attachButton(host).disabled).toBe(false);
    expect(send(host).disabled).toBe(true);

    modEnter(textarea(host));
    act(() => send(host).click());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea(host).value).toBe("drafting");
  });
});

describe("PromptInput — a stable, named text field", () => {
  it("textarea carries name, id and the data handle", () => {
    const host = mount(<PromptInput budgetTokens={1000} name="prompt" inputId="agent-prompt" onSubmit={() => {}} />);
    const ta = textarea(host);

    expect(ta.name).toBe("prompt");
    expect(ta.id).toBe("agent-prompt");
    expect(ta.hasAttribute("data-react-fancy-prompt-input-textarea")).toBe(true);
  });

  it("inline editor takes the id; a hidden field carries the sent text under name", () => {
    const host = mount(
      <PromptInput budgetTokens={1000} pasteThreshold={500} name="prompt" inputId="agent-prompt" onSubmit={() => {}} />,
    );
    const editor = host.querySelector<HTMLElement>("[data-react-fancy-composer-input]")!;
    expect(editor.id).toBe("agent-prompt");

    act(() => {
      editor.textContent = "hello";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(host.querySelector<HTMLInputElement>('input[type="hidden"][name="prompt"]')!.value).toBe("hello");
  });
});

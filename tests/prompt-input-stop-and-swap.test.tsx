// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { PromptInput, type PromptCmd, type PromptDraft } from "../src/components/PromptInput/PromptInput";

vi.setConfig({ testTimeout: 20_000 });
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CC-fancy-0042. An agent chat needs two things PromptInput lacked:
 *
 * - a Stop control while the agent is working (Genie hand-rolled one beside the
 *   composer, MOIC another), so `running` + `onStop` turn Send into Stop;
 * - ONE composer serving N threads by swapping its controlled `draft`. Genie
 *   kept N hidden composers mounted to avoid state leaking between chats.
 *   `draftKey` names whose draft is showing; changing it drops everything that
 *   belonged to the previous one (an open picker, a send still in flight).
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
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  document.body.replaceChildren();
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

const ta = (host: HTMLElement) => host.querySelector<HTMLTextAreaElement>("[data-react-fancy-prompt-input-textarea]")!;
const send = (host: HTMLElement) => host.querySelector<HTMLButtonElement>("[data-react-fancy-prompt-input-send]");
const stop = (host: HTMLElement) => host.querySelector<HTMLButtonElement>("[data-react-fancy-prompt-input-stop]");
const menu = (host: HTMLElement) => host.querySelector("[data-react-fancy-prompt-input-menu]");

function typeInto(el: HTMLTextAreaElement, text: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    set.call(el, text);
    el.setSelectionRange(text.length, text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function sendKey(el: Element) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
  });
}

const draft = (text: string): PromptDraft => ({ v: 1, text, pills: [], attachments: [] });
const COMMANDS: PromptCmd[] = [{ name: "/help", hint: "Help" }];

describe("PromptInput Stop", () => {
  it("turns Send into Stop while running, with a handle, a name and a click", () => {
    const onStop = vi.fn();
    const { host, rerender } = mount(<PromptInput budgetTokens={100} onSubmit={() => {}} running={false} onStop={onStop} />);
    expect(stop(host)).toBeNull();
    expect(send(host)).not.toBeNull();

    rerender(<PromptInput budgetTokens={100} onSubmit={() => {}} running onStop={onStop} />);
    const button = stop(host)!;
    expect(button).not.toBeNull();
    expect(send(host)).toBeNull();
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-label")).toBe("Stop");
    expect(button.disabled).toBe(false);
    act(() => button.click());
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("marks the root as running", () => {
    const { host } = mount(<PromptInput budgetTokens={100} onSubmit={() => {}} running onStop={() => {}} />);
    expect(host.querySelector("[data-react-fancy-prompt-input]")!.getAttribute("data-running")).toBe("true");
  });

  it("is focusable by keyboard (a real button, not a div)", () => {
    const { host } = mount(<PromptInput budgetTokens={100} onSubmit={() => {}} running onStop={() => {}} />);
    act(() => stop(host)!.focus());
    expect(document.activeElement).toBe(stop(host));
  });

  it("running without onStop changes nothing", () => {
    const { host } = mount(<PromptInput budgetTokens={100} onSubmit={() => {}} running />);
    expect(stop(host)).toBeNull();
    expect(send(host)).not.toBeNull();
  });

  it("stopSlot replaces the default Stop control", () => {
    const { host } = mount(
      <PromptInput budgetTokens={100} onSubmit={() => {}} running onStop={() => {}} stopSlot={<button data-mine="">Halt</button>} />,
    );
    expect(host.querySelector("[data-mine]")).not.toBeNull();
    expect(host.querySelector("[data-react-fancy-prompt-input-stop] [data-mine], [data-react-fancy-prompt-input-stop][data-mine]")).not.toBeNull();
    expect(host.querySelectorAll("button[aria-label='Stop']")).toHaveLength(0);
    expect(send(host)).toBeNull();
  });

  it("the send key still sends while running, so a host can queue mid-turn", () => {
    const onSubmit = vi.fn();
    const { host } = mount(<PromptInput budgetTokens={100} onSubmit={onSubmit} running onStop={() => {}} />);
    typeInto(ta(host), "next question");
    sendKey(ta(host));
    expect(onSubmit).toHaveBeenCalledWith("next question", []);
  });

  it("labels.stop translates it", () => {
    const { host } = mount(<PromptInput budgetTokens={100} onSubmit={() => {}} running onStop={() => {}} labels={{ stop: "Anhalten" }} />);
    expect(stop(host)!.getAttribute("aria-label")).toBe("Anhalten");
  });
});

describe("PromptInput: one composer, many threads", () => {
  it("swapping the controlled draft shows the new thread's text (no draftKey needed)", () => {
    const { host, rerender } = mount(<PromptInput budgetTokens={100} onSubmit={() => {}} draft={draft("thread A")} onDraftChange={() => {}} />);
    expect(ta(host).value).toBe("thread A");
    rerender(<PromptInput budgetTokens={100} onSubmit={() => {}} draft={draft("thread B")} onDraftChange={() => {}} />);
    expect(ta(host).value).toBe("thread B");
  });

  it("a new draftKey closes a picker opened in the previous thread", () => {
    (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = () => {};
    let a = draft("");
    const { host, rerender } = mount(
      <PromptInput budgetTokens={100} commands={COMMANDS} onSubmit={() => {}} draftKey="A" draft={a} onDraftChange={(d) => (a = d)} />,
    );
    typeInto(ta(host), "/");
    rerender(<PromptInput budgetTokens={100} commands={COMMANDS} onSubmit={() => {}} draftKey="A" draft={a} onDraftChange={(d) => (a = d)} />);
    expect(menu(host)).not.toBeNull();

    rerender(<PromptInput budgetTokens={100} commands={COMMANDS} onSubmit={() => {}} draftKey="B" draft={draft("hello")} onDraftChange={() => {}} />);
    expect(menu(host)).toBeNull();
  });

  it("a send in flight in thread A does not mark thread B as sending, nor block it", async () => {
    let resolveA!: () => void;
    const onSubmit = vi.fn((text: string) => (text === "from A" ? new Promise<void>((r) => (resolveA = r)) : undefined));
    const onDraftChange = vi.fn();
    const { host, rerender } = mount(
      <PromptInput budgetTokens={100} onSubmit={onSubmit} draftKey="A" draft={draft("from A")} onDraftChange={onDraftChange} />,
    );
    sendKey(ta(host));
    expect(host.querySelector("[data-react-fancy-prompt-input]")!.getAttribute("data-submit-state")).toBe("submitting");

    rerender(<PromptInput budgetTokens={100} onSubmit={onSubmit} draftKey="B" draft={draft("from B")} onDraftChange={onDraftChange} />);
    expect(host.querySelector("[data-react-fancy-prompt-input]")!.getAttribute("data-submit-state")).toBeNull();
    expect(send(host)!.getAttribute("aria-busy")).toBeNull();

    sendKey(ta(host));
    expect(onSubmit).toHaveBeenLastCalledWith("from B", []);

    // A's send settling later must not empty B's draft.
    onDraftChange.mockClear();
    await act(async () => {
      resolveA();
      await Promise.resolve();
    });
    expect(onDraftChange).not.toHaveBeenCalledWith(expect.objectContaining({ text: "" }));
  });

  it("a failure from thread A still reaches onSubmitError, but is not shown on thread B", async () => {
    let rejectA!: (e: unknown) => void;
    const onSubmitError = vi.fn();
    const onSubmit = () => new Promise<void>((_, rej) => (rejectA = rej));
    const { host, rerender } = mount(
      <PromptInput budgetTokens={100} onSubmit={onSubmit} onSubmitError={onSubmitError} draftKey="A" draft={draft("x")} onDraftChange={() => {}} />,
    );
    sendKey(ta(host));
    rerender(<PromptInput budgetTokens={100} onSubmit={onSubmit} onSubmitError={onSubmitError} draftKey="B" draft={draft("y")} onDraftChange={() => {}} />);
    await act(async () => {
      rejectA(new Error("nope"));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onSubmitError).toHaveBeenCalledTimes(1);
    expect(host.querySelector("[data-react-fancy-prompt-input-error]")).toBeNull();
    expect(host.querySelector("[data-react-fancy-prompt-input]")!.getAttribute("data-submit-state")).toBeNull();
  });

  it("an unchanged draftKey keeps an in-flight send in flight", () => {
    const onSubmit = () => new Promise<void>(() => {});
    const { host, rerender } = mount(<PromptInput budgetTokens={100} onSubmit={onSubmit} draftKey="A" draft={draft("x")} onDraftChange={() => {}} />);
    sendKey(ta(host));
    rerender(<PromptInput budgetTokens={100} onSubmit={onSubmit} draftKey="A" draft={draft("x")} onDraftChange={() => {}} />);
    expect(host.querySelector("[data-react-fancy-prompt-input]")!.getAttribute("data-submit-state")).toBe("submitting");
  });
});

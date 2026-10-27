// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createRef, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  PromptInput,
  type PromptDraft,
  type PromptInputHandle,
} from "../src/components/PromptInput/PromptInput";
import { pasteMarker } from "../src/components/PastePills";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Text pills take an optional `label` — genie#1280.
 *
 * Genie sends a plan step into the chat as a pill, and "Pasted text · 412
 * characters" says nothing about which step it is. Image pills already carry a
 * label; text pills now may too. The label is display only: what is SENT is
 * still the full text.
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
});

const STEP = "Step 3: migrate the billing tables. " + "Details follow. ".repeat(30);

function editor(host: HTMLElement): HTMLElement {
  return host.querySelector("[data-react-fancy-composer-input]")!;
}

function pill(host: HTMLElement): HTMLButtonElement {
  return editor(host).querySelector("[data-react-fancy-composer-paste-pill]")!;
}

function submit(target: Element) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }),
    );
  });
}

function labelled(label: unknown, text = STEP): PromptDraft {
  return {
    v: 1,
    text: `see ${pasteMarker("step-3")}`,
    pills: [{ kind: "text", id: "step-3", text, label } as PromptDraft["pills"][number]],
    attachments: [],
  };
}

const n = (s: string) => String(s.length).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

describe("PromptInput — text pill label", () => {
  it("shows the label in place of the generic text, and names it as pasted text", () => {
    const handle = createRef<PromptInputHandle>();
    const { host } = mount(
      <PromptInput ref={handle} budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />,
    );

    act(() => handle.current!.setDraft(labelled("Step 3: migrate the billing tables")));

    expect(pill(host).textContent).toBe("Step 3: migrate the billing tables");
    expect(pill(host).getAttribute("aria-label")).toBe(
      `Insert this pasted text: Step 3: migrate the billing tables, ${n(STEP)} characters`,
    );
  });

  it("keeps the generic text when there is no label", () => {
    const handle = createRef<PromptInputHandle>();
    const { host } = mount(
      <PromptInput ref={handle} budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />,
    );

    act(() => handle.current!.setDraft(labelled(undefined)));

    expect(pill(host).textContent).toBe(`Pasted text · ${n(STEP)} characters`);
    expect(pill(host).getAttribute("aria-label")).toBe(
      `Insert this pasted text, ${n(STEP)} characters`,
    );
  });

  it("still sends the full text, not the label", () => {
    const handle = createRef<PromptInputHandle>();
    let sent = "";
    const { host } = mount(
      <PromptInput
        ref={handle}
        budgetTokens={100000}
        pasteThreshold={500}
        onSubmit={(t) => (sent = t)}
      />,
    );

    act(() => handle.current!.setDraft(labelled("Step 3")));
    submit(editor(host));

    expect(sent).toBe(`see ${STEP}`);
  });

  it("round-trips the label through getDraft, JSON and setDraft", () => {
    const first = createRef<PromptInputHandle>();
    mount(<PromptInput ref={first} budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />);
    act(() => first.current!.setDraft(labelled("Step 3")));

    const saved = JSON.parse(JSON.stringify(first.current!.getDraft())) as PromptDraft;
    expect(saved.pills[0]).toEqual({ kind: "text", id: "step-3", text: STEP, label: "Step 3" });

    mounted.pop()!();
    const second = createRef<PromptInputHandle>();
    const { host } = mount(
      <PromptInput ref={second} budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />,
    );
    act(() => second.current!.setDraft(saved));

    expect(second.current!.getDraft()).toEqual(saved);
    expect(pill(host).textContent).toBe("Step 3");
  });

  it("shows the label from `defaultDraft`", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={100000}
        pasteThreshold={500}
        defaultDraft={labelled("Step 3")}
        onSubmit={() => {}}
      />,
    );

    expect(pill(host).textContent).toBe("Step 3");
  });

  it("shows the label from a controlled `draft`, and keeps it in `onDraftChange`", () => {
    const onDraftChange = vi.fn();
    const draft = labelled("Step 3");
    const { host } = mount(
      <PromptInput
        budgetTokens={100000}
        pasteThreshold={500}
        draft={draft}
        onDraftChange={onDraftChange}
        onSubmit={() => {}}
      />,
    );

    expect(pill(host).textContent).toBe("Step 3");

    // Type after the pill: the draft reported back must still carry the label.
    act(() => {
      const el = editor(host);
      const node = document.createTextNode(" now");
      const last = el.lastChild;
      if (last instanceof HTMLElement && last.tagName === "BR") last.before(node);
      else el.append(node);
      const range = document.createRange();
      range.setStart(node, node.length);
      range.collapse(true);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(onDraftChange).toHaveBeenCalled();
    const reported = onDraftChange.mock.lastCall![0] as PromptDraft;
    expect(reported.pills).toEqual([
      { kind: "text", id: "step-3", text: STEP, label: "Step 3" },
    ]);
  });

  it("renders HTML in a label as text, never as markup", () => {
    const handle = createRef<PromptInputHandle>();
    const { host } = mount(
      <PromptInput ref={handle} budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />,
    );

    act(() => handle.current!.setDraft(labelled('<img src=x onerror="alert(1)"><b>Step</b>')));

    expect(pill(host).querySelector("img, b")).toBeNull();
    expect(pill(host).textContent).toBe('<img src=x onerror="alert(1)"><b>Step</b>');
  });

  it("flattens line breaks and control characters to single spaces", () => {
    const handle = createRef<PromptInputHandle>();
    const { host } = mount(
      <PromptInput ref={handle} budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />,
    );

    // BEL and U+FFFC (the pill marker character) built from code points, not escapes.
    const bel = String.fromCharCode(0x07);
    const mark = String.fromCharCode(0xfffc);
    act(() => handle.current!.setDraft(labelled(`  Step\n3:\t${bel} migrate${mark}  `)));

    expect(pill(host).textContent).toBe("Step 3: migrate");
  });

  it("caps a long label at 80 characters with an ellipsis", () => {
    const handle = createRef<PromptInputHandle>();
    const { host } = mount(
      <PromptInput ref={handle} budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />,
    );

    act(() => handle.current!.setDraft(labelled("x".repeat(200))));

    const shown = pill(host).textContent!;
    expect(Array.from(shown)).toHaveLength(80);
    expect(shown.endsWith("…")).toBe(true);
  });

  it("falls back to the generic text for a blank or non-string label", () => {
    for (const bad of ["   \n ", 42, null]) {
      const handle = createRef<PromptInputHandle>();
      const { host } = mount(
        <PromptInput ref={handle} budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />,
      );

      act(() => handle.current!.setDraft(labelled(bad)));

      expect(pill(host).textContent).toBe(`Pasted text · ${n(STEP)} characters`);
      mounted.pop()!();
    }
  });

  it("drops a non-string label when reading a draft", () => {
    const handle = createRef<PromptInputHandle>();
    mount(<PromptInput ref={handle} budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />);

    act(() => handle.current!.setDraft(labelled(42)));

    expect(handle.current!.getDraft().pills[0]).toEqual({ kind: "text", id: "step-3", text: STEP });
  });
});

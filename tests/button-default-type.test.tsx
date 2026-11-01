// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useRef, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";

import { Button } from "../src/components/Button";
import { PromptInput } from "../src/components/PromptInput/PromptInput";
import { MagicWand } from "../src/components/MagicWand";
import { ReasonTag } from "../src/components/ReasonTag/ReasonTag";
import { JsonEditor } from "../src/components/JsonEditor/JsonEditor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 6.0.0 — BREAKING: `Button` defaults to `type="button"`.
 *
 * Through 5.x a `<Button>` rendered a bare `<button>`, whose HTML default type
 * is `submit`. So every Button inside a `<form>` — a "Cancel", a toolbar toggle,
 * the kit's OWN internal buttons (PromptInput's attach, JsonEditor's move-up) —
 * submitted the form when clicked. The explicit `type` prop still wins, so a
 * Button that is meant to submit says `type="submit"`.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function staticEl(node: ReactElement): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(node);
  return host.querySelector("[data-react-fancy-button]") as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Button type attribute", () => {
  it("defaults to type=button", () => {
    const el = staticEl(<Button>Act</Button>);
    expect(el.tagName).toBe("BUTTON");
    expect(el.getAttribute("type")).toBe("button");
  });

  it("lets an explicit type=submit win", () => {
    expect(staticEl(<Button type="submit">Save</Button>).getAttribute("type")).toBe("submit");
  });

  it("lets an explicit type=reset win", () => {
    expect(staticEl(<Button type="reset">Reset</Button>).getAttribute("type")).toBe("reset");
  });

  it("keeps an explicit type=button", () => {
    expect(staticEl(<Button type="button">Act</Button>).getAttribute("type")).toBe("button");
  });

  it("keeps the default when a wrapper forwards type={undefined}", () => {
    // A wrapper that forwards an optional `type` passes `undefined` when unset;
    // spread over a default, that would silently revert to submit.
    expect(staticEl(<Button type={undefined}>Act</Button>).getAttribute("type")).toBe("button");
  });

  it("puts no type on the anchor in href mode", () => {
    const el = staticEl(<Button href="/docs">Docs</Button>);
    expect(el.tagName).toBe("A");
    expect(el.hasAttribute("type")).toBe(false);
  });

  it("gives the disabled-with-href fallback <button> the default too", () => {
    const el = staticEl(
      <Button href="/docs" disabled>
        Docs
      </Button>,
    );
    expect(el.tagName).toBe("BUTTON");
    expect(el.getAttribute("type")).toBe("button");
  });

  it("gives the circle (icon-only) variant the default too", () => {
    const el = staticEl(<Button icon="plus" aria-label="Add" />);
    expect(el.getAttribute("type")).toBe("button");
  });
});

describe("Button inside a <form>", () => {
  it("does NOT submit the form when it has no type", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { host } = mount(
      <form onSubmit={onSubmit}>
        <Button>Act</Button>
      </form>,
    );
    act(() => host.querySelector("button")!.click());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("DOES submit the form with type=submit", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { host } = mount(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>,
    );
    act(() => host.querySelector("button")!.click());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("DOES submit via requestSubmit with the type=submit Button as submitter", () => {
    let submitter: Element | null = null;
    const { host } = mount(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitter = (e.nativeEvent as SubmitEvent).submitter;
        }}
      >
        <Button>Act</Button>
        <Button type="submit" name="intent" value="save">
          Save
        </Button>
      </form>,
    );
    const save = host.querySelectorAll("button")[1]!;
    act(() => host.querySelector("form")!.requestSubmit(save));
    expect(submitter).toBe(save);
  });

  it("resets the form with type=reset", () => {
    const { host } = mount(
      <form>
        <input defaultValue="a" />
        <Button type="reset">Reset</Button>
      </form>,
    );
    const input = host.querySelector("input")!;
    input.value = "changed";
    act(() => host.querySelector("button")!.click());
    expect(input.value).toBe("a");
  });
});

/**
 * Every internal button the kit renders: none of them is meant to submit a
 * consumer's form. Clicking each one inside a `<form onSubmit>` must never fire
 * it. Through 5.x the Button-based ones did (and PromptInput's attachment
 * remove chip, a bare native <button>, did too).
 */
function clickEveryButton(host: HTMLElement) {
  const seen = new Set<Element>();
  // Clicking can re-render and reveal more (JsonEditor's add form), so sweep
  // until nothing new appears.
  for (let pass = 0; pass < 4; pass++) {
    const buttons = Array.from(host.querySelectorAll("button")).filter((b) => !seen.has(b));
    if (buttons.length === 0) break;
    for (const b of buttons) {
      seen.add(b);
      if (!b.isConnected || b.disabled) continue;
      act(() => b.click());
    }
  }
  return seen.size;
}

function inForm(el: ReactElement) {
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
  const m = mount(<form onSubmit={onSubmit}>{el}</form>);
  return { ...m, onSubmit };
}

function file(name: string): File {
  return new File(["x"], name, { type: "text/plain" });
}

function dropFiles(target: Element, files: File[]) {
  const ev = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "dataTransfer", { value: { files }, writable: false });
  act(() => {
    target.dispatchEvent(ev);
  });
}

describe("PromptInput inside a <form>", () => {
  it("send (label) calls onSubmit and does not submit the enclosing form", () => {
    const sent = vi.fn();
    const { host, onSubmit } = inForm(
      <PromptInput budgetTokens={1000} defaultValue="hello" onSubmit={sent} />,
    );
    const send = host.querySelector<HTMLButtonElement>("[data-react-fancy-prompt-input-send]")!;
    expect(send.getAttribute("type")).toBe("button");
    act(() => send.click());
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0]![0]).toBe("hello");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("send (icon) calls onSubmit and does not submit the enclosing form", () => {
    const sent = vi.fn();
    const { host, onSubmit } = inForm(
      <PromptInput budgetTokens={1000} defaultValue="hi" sendButton="icon" onSubmit={sent} />,
    );
    const send = host.querySelector<HTMLButtonElement>("[data-react-fancy-prompt-input-send]")!;
    expect(send.getAttribute("type")).toBe("button");
    act(() => send.click());
    expect(sent).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("attach opens the picker without submitting the enclosing form", () => {
    const { host, onSubmit } = inForm(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);
    const attach = host.querySelector<HTMLButtonElement>("[data-react-fancy-prompt-input-attach]")!;
    const picker = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    const opened = vi.spyOn(picker, "click");
    expect(attach.getAttribute("type")).toBe("button");
    act(() => attach.click());
    expect(opened).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("the attachment remove chip removes without submitting the enclosing form", () => {
    const { host, onSubmit } = inForm(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);
    dropFiles(host.querySelector("[data-react-fancy-prompt-input]")!, [file("a.txt")]);
    expect(host.textContent).toContain("a.txt");
    const remove = host.querySelector<HTMLButtonElement>('[aria-label="Remove attachment"]')!;
    expect(remove.getAttribute("type")).toBe("button");
    act(() => remove.click());
    expect(host.textContent).not.toContain("a.txt");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("other internal Buttons inside a <form>", () => {
  it("MagicWand actions do not submit", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    function Host() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("hello world");
      return (
        <form onSubmit={onSubmit}>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <MagicWand
            target={ref}
            value={value}
            onValueChange={setValue}
            actions={[{ id: "upper", label: "Upper", run: (s) => s.toUpperCase() }]}
          />
        </form>
      );
    }
    mount(<Host />);
    const ta = document.querySelector("textarea")!;
    act(() => {
      ta.setSelectionRange(6, 11);
      ta.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    const action = document.querySelector<HTMLButtonElement>(
      '[data-react-fancy-magic-wand-action="upper"]',
    )!;
    expect(action.getAttribute("type")).toBe("button");
    // The wand portals out of the form; React still bubbles the synthetic
    // click, but a native submit only follows a button the form OWNS. Check
    // the type (above) and that nothing reached onSubmit.
    await act(async () => action.click());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ReasonTag's follow-up does not submit", () => {
    vi.useFakeTimers();
    const follow = vi.fn();
    const { host, onSubmit } = inForm(
      <ReasonTag value="42" reason="because" onFollowUp={follow} />,
    );
    // The follow-up lives in a hover popover: hover the trigger, let it open.
    const trigger = host.querySelector(".cursor-help")!;
    act(() => {
      trigger.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    act(() => vi.advanceTimersByTime(500));
    vi.useRealTimers();
    const ask = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("ask follow-up"),
    )!;
    expect(ask).toBeDefined();
    expect(ask.getAttribute("type")).toBe("button");
    act(() => ask.click());
    expect(follow).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("no JsonEditor button submits (toggle, add, move, remove, add-confirm/cancel)", () => {
    const { host, onSubmit } = inForm(
      <JsonEditor
        value={{ list: [1, 2, 3], obj: { a: "x" } }}
        allowAdd
        allowRemove
        allowReorder
      />,
    );
    const untyped = Array.from(host.querySelectorAll("button")).filter(
      (b) => b.getAttribute("type") !== "button",
    );
    expect(untyped.map((b) => b.outerHTML.slice(0, 120))).toEqual([]);
    const clicked = clickEveryButton(host);
    expect(clicked).toBeGreaterThan(3);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("JsonEditor's pending accept/reject do not submit", () => {
    const { host, onSubmit } = inForm(
      <JsonEditor
        value={{ a: 1 }}
        pendingMode
        pending={[{ id: "p1", op: "set", path: "a", value: 2, label: "a = 2" }]}
      />,
    );
    const pendingButtons = Array.from(
      host.querySelectorAll<HTMLButtonElement>(
        "[data-react-fancy-json-editor-accept], [data-react-fancy-json-editor-reject]",
      ),
    );
    expect(pendingButtons.length).toBeGreaterThan(0);
    for (const b of pendingButtons) expect(b.getAttribute("type")).toBe("button");
    clickEveryButton(host);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { PromptInput, type PromptAttachment } from "../src/components/PromptInput/PromptInput";

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
  return { host };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  vi.useRealTimers();
});

const WALL = `${"w".repeat(600)}`;

function input(host: HTMLElement): HTMLElement {
  return host.querySelector("[data-react-fancy-composer-input]")!;
}

function caretAt(node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Type the way a browser does: change the DOM, caret after it, fire `input`. */
function type(host: HTMLElement, text: string) {
  const el = input(host);
  act(() => {
    const node = document.createTextNode(text);
    const last = el.lastChild;
    if (last instanceof HTMLElement && last.tagName === "BR") last.before(node);
    else el.append(node);
    caretAt(node, text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function paste(host: HTMLElement, data: { text?: string; files?: File[] }) {
  const ev = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: {
      getData: (t: string) => (t === "text/plain" ? (data.text ?? "") : ""),
      files: data.files ?? [],
    },
  });
  act(() => {
    input(host).dispatchEvent(ev);
  });
}

function key(target: Element, k: string, mods: { ctrlKey?: boolean; shiftKey?: boolean } = {}) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...mods }),
    );
  });
}

function hover(el: Element) {
  vi.useFakeTimers();
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(500);
  });
  return document.querySelector("[data-react-fancy-tooltip]");
}

const image = () => new File([new Uint8Array([137, 80, 78, 71])], "image.png", { type: "image/png" });

/**
 * react-fancy#32 — Genie 2's chat composer is `PromptInput`, and the owner asked
 * (2026-10-15) for friendly paste and a quieter footer. Paste follows the owner's
 * own spec from the day before, given against screenshots of this composer: the
 * pill sits IN the message where the paste happened, a text pill gets its own
 * line, and clicking it puts the full text back exactly there.
 *
 * Everything is opt-in — every test in the first block is about a default.
 */
describe("PromptInput — defaults are unchanged", () => {
  it("is still a textarea with the labelled attach, the hint, the meter and send", () => {
    const { host } = mount(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);

    expect(host.querySelector("textarea")).not.toBeNull();
    expect(host.querySelector("[data-react-fancy-composer-input]")).toBeNull();
    expect(host.textContent).toContain("attach");
    expect(host.querySelector("[data-react-fancy-prompt-input-hint]")).not.toBeNull();
    expect(host.querySelector("[data-react-fancy-prompt-input-meter]")).not.toBeNull();
    expect(host.textContent).toContain("send");
  });
});

describe("PromptInput — inline paste pills", () => {
  it("holds a big paste as a pill on its own line, where it was pasted", () => {
    const { host } = mount(
      <PromptInput budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />,
    );

    type(host, "look at this");
    paste(host, { text: WALL });

    const pill = input(host).querySelector("[data-react-fancy-composer-paste-pill]");
    expect(pill?.textContent).toBe("Pasted text · 600 characters");
    expect(input(host).textContent?.startsWith("look at this\n")).toBe(true);
  });

  it("sends the paste expanded where it sat, on Ctrl+Enter", () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput budgetTokens={100000} pasteThreshold={500} onSubmit={(t) => sent.push(t)} />,
    );

    type(host, "look at this");
    paste(host, { text: WALL });
    type(host, "thanks");
    key(input(host), "Enter", { ctrlKey: true });

    expect(sent).toEqual([`look at this\n${WALL}\nthanks`]);
  });

  it("can send a message that is ONLY a paste", () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput budgetTokens={100000} pasteThreshold={500} onSubmit={(t) => sent.push(t)} />,
    );

    paste(host, { text: WALL });
    key(input(host), "Enter", { ctrlKey: true });

    expect(sent).toEqual([`${WALL}\n`]);
  });

  it("keeps the send contract: plain Enter is a newline, not a send", () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput budgetTokens={100000} pasteThreshold={500} onSubmit={(t) => sent.push(t)} />,
    );

    type(host, "one");
    key(input(host), "Enter");
    type(host, "two");
    key(input(host), "Enter", { ctrlKey: true });

    expect(sent).toEqual(["one\ntwo"]);
  });

  it("clicking a text pill puts its full text back where it sat", () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput budgetTokens={100000} pasteThreshold={500} onSubmit={(t) => sent.push(t)} />,
    );

    type(host, "a");
    paste(host, { text: WALL });
    act(() => {
      (input(host).querySelector("[data-react-fancy-composer-paste-pill]") as HTMLElement).click();
    });

    expect(input(host).querySelector("[data-react-fancy-composer-paste-pill]")).toBeNull();
    expect(input(host).textContent).toContain(WALL);
  });

  it("previewChars sets how much of each end the hover shows", () => {
    const { host } = mount(
      <PromptInput budgetTokens={100000} pasteThreshold={500} previewChars={30} onSubmit={() => {}} />,
    );
    const text = `${"A".repeat(30)}${"m".repeat(600)}${"Z".repeat(30)}`;

    paste(host, { text });
    const tip = hover(input(host).querySelector("[data-react-fancy-composer-paste-pill]")!);

    expect(tip?.textContent).toContain(`${"A".repeat(30)} … ${"Z".repeat(30)}`);
  });

  it("the / command picker still works in the inline editor", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={100000}
        pasteThreshold={500}
        commands={[{ name: "/rewrite", hint: "rewrite it" }]}
        onSubmit={() => {}}
      />,
    );

    type(host, "/re");
    expect(host.textContent).toContain("/rewrite");

    key(input(host), "Enter");

    expect(input(host).textContent).toBe("/rewrite ");
  });

  it("the @ mention picker still works in the inline editor", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={100000}
        pasteThreshold={500}
        mentions={[{ id: "ada", name: "Ada", kind: "person" }]}
        onSubmit={() => {}}
      />,
    );

    type(host, "hi @Ad");
    key(input(host), "Enter");

    expect(input(host).textContent).toBe("hi @ada ");
  });

  it("Tab accepts the highlighted / command, as Enter does", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={100000}
        pasteThreshold={500}
        commands={[{ name: "/rewrite", hint: "rewrite it" }, { name: "/review", hint: "review it" }]}
        onSubmit={() => {}}
      />,
    );

    type(host, "/re");
    key(input(host), "ArrowDown");
    key(input(host), "Tab");

    expect(input(host).textContent).toBe("/review ");
  });

  it("Tab accepts the highlighted @ mention", () => {
    const { host } = mount(
      <PromptInput
        budgetTokens={100000}
        pasteThreshold={500}
        mentions={[{ id: "ada", name: "Ada", kind: "person" }]}
        onSubmit={() => {}}
      />,
    );

    type(host, "hi @Ad");
    key(input(host), "Tab");

    expect(input(host).textContent).toBe("hi @ada ");
  });

  it("leaves Tab alone when no menu is open, so focus moves on", () => {
    const { host } = mount(<PromptInput budgetTokens={100000} pasteThreshold={500} onSubmit={() => {}} />);
    type(host, "hello");
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    act(() => {
      input(host).dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(false);
  });

  it("dropped files still attach in the inline editor", () => {
    let got: PromptAttachment[] = [];
    const { host } = mount(
      <PromptInput budgetTokens={100000} pasteThreshold={500} onSubmit={(_t, a) => (got = a)} />,
    );
    const pdf = new File(["x"], "handbook.pdf", { type: "application/pdf" });

    const ev = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "dataTransfer", { value: { files: [pdf] } });
    act(() => {
      host.firstElementChild!.dispatchEvent(ev);
    });
    type(host, "see attached");
    key(input(host), "Enter", { ctrlKey: true });

    expect(got.map((a) => a.file)).toEqual([pdf]);
  });
});

describe("PromptInput — pasteImages", () => {
  it("puts a pasted image in the sentence AND hands it over as an attachment", () => {
    let got: { text: string; attachments: PromptAttachment[] } | null = null;
    const { host } = mount(
      <PromptInput
        budgetTokens={100000}
        pasteImages
        onSubmit={(text, attachments) => (got = { text, attachments })}
      />,
    );
    const shot = image();

    type(host, "This is what ");
    paste(host, { files: [shot] });
    type(host, " I mean");

    const pill = input(host).querySelector("[data-react-fancy-composer-image-pill]");
    expect(pill?.textContent).toBe("Pasted image 1");
    // Not ALSO a chip in the attachment bar: one image, one place on screen.
    expect(host.textContent).not.toContain("image.png");

    key(input(host), "Enter", { ctrlKey: true });

    expect(got!.text).toBe("This is what [Pasted image 1] I mean");
    expect(got!.attachments.map((a) => a.file)).toEqual([shot]);
    expect(got!.attachments[0]!.type).toBe("image/png");
  });

  it("without pasteImages a pasted image is still an ordinary attachment chip", () => {
    // The pre-5.39 behaviour, unchanged for anyone who has not opted in.
    const { host } = mount(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);
    const ta = host.querySelector("textarea")!;
    const ev = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "clipboardData", {
      value: { getData: () => "", files: [image()] },
    });
    act(() => {
      ta.dispatchEvent(ev);
    });

    expect(host.textContent).toContain("image.png");
  });
});

describe("PromptInput — quieter footer", () => {
  it('attachButton="icon" is an icon with an accessible name and a tooltip', () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} attachButton="icon" onSubmit={() => {}} />,
    );

    const button = host.querySelector("[data-react-fancy-prompt-input-attach]")!;
    expect(button.textContent?.trim()).toBe("");
    expect(button.getAttribute("aria-label")).toBe("Attach files");
    expect(hover(button)?.textContent).toContain("Attach");
  });

  it('sendButton="icon" carries the shortcut in its tooltip instead of the inline hint', () => {
    const { host } = mount(
      <PromptInput budgetTokens={1000} sendButton="icon" platform="windows" onSubmit={() => {}} />,
    );

    const button = host.querySelector("[data-react-fancy-prompt-input-send]")!;
    expect(button.textContent?.trim()).toBe("");
    expect(button.getAttribute("aria-label")).toBe("Send");
    expect(host.querySelector("[data-react-fancy-prompt-input-hint]")).toBeNull();
    expect(hover(button)?.textContent).toContain("Ctrl+Enter");
  });

  it("the icon send button still sends", () => {
    const sent: string[] = [];
    const { host } = mount(
      <PromptInput budgetTokens={1000} sendButton="icon" onSubmit={(t) => sent.push(t)} />,
    );
    const ta = host.querySelector("textarea")!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    act(() => {
      setValue.call(ta, "hello");
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    });

    act(() => {
      (host.querySelector("[data-react-fancy-prompt-input-send]") as HTMLElement).click();
    });

    expect(sent).toEqual(["hello"]);
  });

  describe("the meter", () => {
    const meter = (host: HTMLElement) =>
      host.querySelector<HTMLElement>("[data-react-fancy-prompt-input-meter]");

    it("usedTokens is the caller's real value, with the draft added on top", () => {
      const { host } = mount(
        <PromptInput budgetTokens={200000} usedTokens={88000} onSubmit={() => {}} />,
      );

      expect(meter(host)?.textContent).toContain("88.0k / 200.0k");
    });

    it('meter="near-limit" is hidden while there is plenty of room', () => {
      const { host } = mount(
        <PromptInput budgetTokens={200000} usedTokens={20000} meter="near-limit" onSubmit={() => {}} />,
      );

      expect(meter(host)).toBeNull();
    });

    it('meter="near-limit" appears MUTED once usage passes meterShowAt', () => {
      const { host } = mount(
        <PromptInput budgetTokens={200000} usedTokens={160000} meter="near-limit" onSubmit={() => {}} />,
      );

      expect(meter(host)?.getAttribute("data-level")).toBe("muted");
    });

    it('meter="near-limit" takes the warning colour only past meterWarnAt', () => {
      const { host } = mount(
        <PromptInput budgetTokens={200000} usedTokens={190000} meter="near-limit" onSubmit={() => {}} />,
      );

      expect(meter(host)?.getAttribute("data-level")).toBe("warn");
    });

    it("the thresholds are the caller's to set", () => {
      const { host } = mount(
        <PromptInput
          budgetTokens={1000}
          usedTokens={300}
          meter="near-limit"
          meterShowAt={0.25}
          meterWarnAt={0.5}
          onSubmit={() => {}}
        />,
      );

      expect(meter(host)?.getAttribute("data-level")).toBe("muted");
    });

    it('meter="hidden" never shows it', () => {
      const { host } = mount(
        <PromptInput budgetTokens={1000} usedTokens={999} meter="hidden" onSubmit={() => {}} />,
      );

      expect(meter(host)).toBeNull();
    });
  });
});

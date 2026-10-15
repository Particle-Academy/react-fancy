// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Composer } from "../src/components/Composer/Composer";
import { pasteMarker, type HeldImage, type HeldPaste } from "../src/index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  const unmount = () => {
    act(() => root.unmount());
    host.remove();
  };
  mounted.push(unmount);
  return { host };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  vi.useRealTimers();
});

const WALL = `${"START".repeat(1)}${"x".repeat(600)}${"END"}`;

function input(host: HTMLElement): HTMLElement {
  return host.querySelector("[data-react-fancy-composer-input]")!;
}

/**
 * Type the way a browser does: change the DOM, put the caret at the end of what
 * was typed, fire `input`. The editor reads the DOM back, as it does in a browser.
 */
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

function caretAt(node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

/** jsdom has no clipboard event carrying data, so hand React the shape its handler reads. */
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
  return ev;
}

function key(host: HTMLElement, k: string, shiftKey = false) {
  act(() => {
    input(host).dispatchEvent(
      new KeyboardEvent("keydown", { key: k, shiftKey, bubbles: true, cancelable: true }),
    );
  });
}

function click(el: Element | null) {
  act(() => {
    (el as HTMLElement).click();
  });
}

const image = () => new File([new Uint8Array([137, 80, 78, 71])], "shot.png", { type: "image/png" });

/** A Composer whose value and held pastes the test can read. */
function Harness(props: {
  onValue?: (v: string) => void;
  onSubmit?: (v: string, extras: { images: HeldImage[] }) => void;
  onPastes?: (p: HeldPaste[]) => void;
  [k: string]: unknown;
}) {
  const { onValue, onSubmit, onPastes, ...rest } = props;
  const [value, setValue] = useState("");
  return (
    <Composer
      pasteThreshold={500}
      pastePlacement="inline"
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
      onSubmit={onSubmit}
      onHeldPastesChange={onPastes}
      {...rest}
    />
  );
}

/**
 * Inline placement — the pill goes in the message, where the paste happened.
 *
 * Asked for by the owner on 2026-10-14, against screenshots: "This is what
 * [Pasted image 1] I mean", with a `Pasted text · 669 characters` pill on a line
 * of its own below. It is also the MOIC estate's own design (the pill as a marker
 * inside the message), which is why they never adopted the beside-the-input layout.
 */
describe("Composer - inline paste pills", () => {
  it("puts the pill WHERE the paste happened, not in a row above", () => {
    let value = "";
    const { host } = mount(<Harness onValue={(v) => (value = v)} />);

    type(host, "before after");
    caretAt(input(host).firstChild!, "before ".length);
    paste(host, { text: WALL });

    const pill = input(host).querySelector("[data-react-fancy-composer-paste-pill]");
    expect(pill).not.toBeNull();
    expect(host.querySelector("[data-react-fancy-composer-paste-pills]")).toBeNull();

    const id = pill!.getAttribute("data-react-fancy-composer-paste-pill")!;
    expect(value).toBe(`before \n${pasteMarker(id)}\nafter`);
  });

  it("gives a text pill a line of its own: a newline above and below", () => {
    let value = "";
    const { host } = mount(<Harness onValue={(v) => (value = v)} />);

    type(host, "This is what I mean");
    paste(host, { text: WALL });

    const id = input(host)
      .querySelector("[data-react-fancy-composer-paste-pill]")!
      .getAttribute("data-react-fancy-composer-paste-pill")!;
    expect(value).toBe(`This is what I mean\n${pasteMarker(id)}\n`);
  });

  it("adds no blank line above a pill pasted at the start of a line", () => {
    let value = "";
    const { host } = mount(<Harness onValue={(v) => (value = v)} />);

    paste(host, { text: WALL });

    const id = input(host)
      .querySelector("[data-react-fancy-composer-paste-pill]")!
      .getAttribute("data-react-fancy-composer-paste-pill")!;
    expect(value).toBe(`${pasteMarker(id)}\n`);
  });

  it("clicking a text pill removes it and puts ALL its text exactly there", () => {
    let value = "";
    let pastes: HeldPaste[] = [];
    const { host } = mount(
      <Harness onValue={(v) => (value = v)} onPastes={(p) => (pastes = p)} />,
    );

    type(host, "before after");
    caretAt(input(host).firstChild!, "before ".length);
    paste(host, { text: WALL });
    click(input(host).querySelector("[data-react-fancy-composer-paste-pill]"));

    expect(value).toBe(`before \n${WALL}\nafter`);
    expect(input(host).querySelector("[data-react-fancy-composer-paste-pill]")).toBeNull();
    expect(pastes).toEqual([]);
  });

  it("A SEND WITH THE PILL STILL CLOSED CARRIES THE TEXT, where the pill sat", () => {
    const sent: string[] = [];
    const { host } = mount(<Harness onSubmit={(v) => sent.push(v)} />);

    type(host, "before after");
    caretAt(input(host).firstChild!, "before ".length);
    paste(host, { text: WALL });
    key(host, "Enter");

    expect(sent).toEqual([`before \n${WALL}\nafter`]);
    expect(input(host).textContent).toBe("");
  });

  it("backspacing a pill out of the message drops the held paste with it", () => {
    // The message is the record of what is attached. If state still held the
    // paste, it would say "attached" about something the message no longer has.
    let pastes: HeldPaste[] = [];
    const sent: string[] = [];
    const { host } = mount(
      <Harness onPastes={(p) => (pastes = p)} onSubmit={(v) => sent.push(v)} />,
    );

    type(host, "keep ");
    paste(host, { text: WALL });
    expect(pastes).toHaveLength(1);

    act(() => {
      input(host).querySelector("[data-react-fancy-composer-paste-host]")!.remove();
      input(host).dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(pastes).toEqual([]);
    key(host, "Enter");
    expect(sent[0]).not.toContain("x".repeat(600));
  });

  it("an ordinary paste is inserted as plain text, never as the clipboard's HTML", () => {
    let value = "";
    const { host } = mount(<Harness onValue={(v) => (value = v)} />);

    type(host, "hi ");
    const ev = paste(host, { text: "<b>12 Acacia Avenue</b>" });

    expect(value).toBe("hi <b>12 Acacia Avenue</b>");
    expect(input(host).querySelector("b")).toBeNull();
    expect(ev.defaultPrevented).toBe(true);
  });

  it("Shift+Enter is a newline and Enter sends", () => {
    const sent: string[] = [];
    let value = "";
    const { host } = mount(
      <Harness onValue={(v) => (value = v)} onSubmit={(v) => sent.push(v)} />,
    );

    type(host, "one");
    key(host, "Enter", true);
    expect(value).toBe("one\n");
    type(host, "two");
    expect(value).toBe("one\ntwo");
    key(host, "Enter");
    expect(sent).toEqual(["one\ntwo"]);
  });

  it("an agent can attach a paste by writing the marker and the held paste", () => {
    // The contract: nothing an agent might need to write is internal-only.
    const paste1: HeldPaste = { id: "agent-1", text: WALL };
    const sent: string[] = [];
    const { host } = mount(
      <Composer
        pastePlacement="inline"
        pasteThreshold={500}
        value={`see ${pasteMarker("agent-1")}`}
        heldPastes={[paste1]}
        onSubmit={(v) => sent.push(v)}
      />,
    );

    const pill = input(host).querySelector('[data-react-fancy-composer-paste-pill="agent-1"]');
    expect(pill?.textContent).toBe("Pasted text · 608 characters");
    key(host, "Enter");
    expect(sent).toEqual([`see ${WALL}`]);
  });

  it("a marker naming nothing held stays text, so pasted content cannot invent an attachment", () => {
    const { host } = mount(
      <Composer pastePlacement="inline" value={`a ${pasteMarker("ghost")} b`} />,
    );

    expect(input(host).querySelector("[data-react-fancy-composer-paste-host]")).toBeNull();
    expect(input(host).textContent).toContain("ghost");
  });

  describe("images", () => {
    it("a pasted image becomes an inline pill in the sentence, with no line of its own", () => {
      let value = "";
      const { host } = mount(<Harness pasteImages onValue={(v) => (value = v)} />);

      type(host, "This is what ");
      paste(host, { files: [image()] });
      type(host, " I mean");

      const pill = input(host).querySelector("[data-react-fancy-composer-image-pill]");
      expect(pill?.textContent).toBe("Pasted image 1");
      expect(value).toBe(`This is what ${pasteMarker("image-1")} I mean`);
    });

    it("sends the image to onSubmit and marks where it sat in the text", () => {
      const sent: Array<[string, HeldImage[]]> = [];
      const { host } = mount(
        <Harness pasteImages onSubmit={(v, x) => sent.push([v, x.images])} />,
      );
      const file = image();

      type(host, "This is what ");
      paste(host, { files: [file] });
      type(host, " I mean");
      key(host, "Enter");

      expect(sent).toHaveLength(1);
      expect(sent[0][0]).toBe("This is what [Pasted image 1] I mean");
      expect(sent[0][1].map((i) => i.file)).toEqual([file]);
    });

    it("numbers images by arrival and keeps the number after an earlier one is deleted", () => {
      const { host } = mount(<Harness pasteImages />);

      paste(host, { files: [image()] });
      paste(host, { files: [image()] });
      act(() => {
        input(host).querySelector('[data-react-fancy-composer-paste-host="image-1"]')!.remove();
        input(host).dispatchEvent(new Event("input", { bubbles: true }));
      });

      const labels = Array.from(
        input(host).querySelectorAll("[data-react-fancy-composer-image-pill]"),
        (el) => el.textContent,
      );
      expect(labels).toEqual(["Pasted image 2"]);
    });

    it("does nothing with an image unless pasteImages is on", () => {
      // A pill reads as attached; an image the host never reads is one the person
      // believes went and did not. So it is a promise the host opts into.
      const { host } = mount(<Harness />);

      paste(host, { files: [image()] });

      expect(input(host).querySelector("[data-react-fancy-composer-image-pill]")).toBeNull();
    });

    it("a clipboard with text AND an image pastes the text", () => {
      let value = "";
      const { host } = mount(<Harness pasteImages onValue={(v) => (value = v)} />);

      paste(host, { text: "a sentence", files: [image()] });

      expect(value).toBe("a sentence");
      expect(input(host).querySelector("[data-react-fancy-composer-image-pill]")).toBeNull();
    });
  });

  describe("customising", () => {
    function hoverPreview(host: HTMLElement, selector: string): HTMLElement | null {
      vi.useFakeTimers();
      act(() => {
        input(host)
          .querySelector(selector)!
          .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      return document.querySelector("[data-react-fancy-composer-paste-pill-preview]");
    }

    it("previewChars sets how much of each end the hover shows", () => {
      const { host } = mount(<Harness previewChars={30} />);
      const text = `${"A".repeat(30)}${"m".repeat(600)}${"Z".repeat(30)}`;

      paste(host, { text });
      const preview = hoverPreview(host, "[data-react-fancy-composer-paste-pill]");

      expect(preview?.textContent).toBe(`${"A".repeat(30)} … ${"Z".repeat(30)}`);
    });

    it("classNames restyle the pill and the popover", () => {
      const { host } = mount(
        <Harness classNames={{ pill: "my-pill", textPill: "my-text", preview: "my-pop" }} />,
      );

      paste(host, { text: WALL });
      const pill = input(host).querySelector("[data-react-fancy-composer-paste-pill]")!;
      expect(pill.className).toContain("my-pill");
      expect(pill.className).toContain("my-text");

      const preview = hoverPreview(host, "[data-react-fancy-composer-paste-pill]");
      expect(preview?.closest("[data-react-fancy-tooltip]")?.className).toContain("my-pop");
    });

    it("renderPastePreview replaces what the popover shows", () => {
      const { host } = mount(
        <Harness
          renderPastePreview={(p: { kind: string }) => <em>custom {p.kind}</em>}
        />,
      );

      paste(host, { text: WALL });
      const preview = hoverPreview(host, "[data-react-fancy-composer-paste-pill]");

      expect(preview?.querySelector("em")?.textContent).toBe("custom text");
    });

    it("previewChars applies above the input too", () => {
      const { host } = mount(
        <Composer pasteThreshold={500} previewChars={30} />,
      );
      const textarea = host.querySelector("textarea")!;
      const ev = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(ev, "clipboardData", {
        value: { getData: () => `${"A".repeat(30)}${"m".repeat(600)}${"Z".repeat(30)}` },
      });
      act(() => {
        textarea.dispatchEvent(ev);
      });

      const preview = host.querySelector("[data-react-fancy-composer-paste-pill-preview]");
      expect(preview?.textContent).toBe(`${"A".repeat(30)} … ${"Z".repeat(30)}`);
    });
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Composer } from "../src/components/Composer/Composer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/** jsdom has no clipboard event carrying data, so hand React the shape its handler reads. */
function paste(host: HTMLElement, text: string) {
  const textarea = host.querySelector("textarea")!;
  const ev = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: { getData: (t: string) => (t === "text/plain" || t === "text" ? text : "") },
    writable: false,
  });
  act(() => {
    textarea.dispatchEvent(ev);
  });
  return ev;
}

/**
 * Types into the textarea the way React will actually notice.
 *
 * Assigning `.value` directly and dispatching `input` does NOT work: React keeps
 * its own value tracker on the node, sees no change, and skips `onChange` — so the
 * component's state stays empty while the DOM shows the text. Four tests here
 * failed that way and the failures read exactly like the component dropping typed
 * input. Going through the prototype's native setter updates the tracker too.
 */
function type(host: HTMLElement, text: string) {
  const textarea = host.querySelector("textarea")! as HTMLTextAreaElement;
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )!.set!;

  act(() => {
    setValue.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function click(el: Element | null) {
  act(() => {
    (el as HTMLElement).click();
  });
}

const pills = (host: HTMLElement) =>
  Array.from(host.querySelectorAll("[data-react-fancy-composer-paste-pill]"));

const sendButton = (host: HTMLElement) =>
  Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Send")!;

const WALL = "A".repeat(2036);

/**
 * A large paste is held beside the composer as a pill, not dumped into it.
 *
 * Requested by a consumer who had already built and proven it against their own
 * hand-rolled composer, and sent the spec rather than a patch because they are not
 * on this component. Paste a transcript into a composer and it becomes a scrolling
 * wall: the message you were half way through writing is above the fold, and the
 * only way to see what you are about to send is to scroll your own input.
 *
 * ---------------------------------------------------------------------------
 * The two tests that matter
 * ---------------------------------------------------------------------------
 *
 * "A SEND WITH THE PILL STILL CLOSED CARRIES THE TEXT" is the dangerous state, and
 * the consumer flagged it as where review attention belongs. **A pill reads as
 * "your paste is attached."** Dropping it on send means asking a question about a
 * document without the document, and nobody can tell: the sender believes it went,
 * the receiver sees a question about nothing.
 *
 * "an ordinary paste stays completely ordinary" is the common case and the easiest
 * thing to regress. No prevented event, no pill, no ceremony for an address.
 */
describe("Composer - paste as pill", () => {
  it("holds a paste over the threshold instead of inserting it", () => {
    const { host, unmount } = mount(<Composer pasteThreshold={500} />);

    const ev = paste(host, WALL);

    expect(ev.defaultPrevented).toBe(true);
    expect(pills(host)).toHaveLength(1);
    expect((host.querySelector("textarea") as HTMLTextAreaElement).value).toBe("");

    unmount();
  });

  it("an ordinary paste stays completely ordinary", () => {
    const { host, unmount } = mount(<Composer pasteThreshold={500} />);

    const ev = paste(host, "12 Acacia Avenue");

    expect(ev.defaultPrevented).toBe(false);
    expect(pills(host)).toHaveLength(0);

    unmount();
  });

  it("does nothing at all unless a threshold is set", () => {
    // Opt-in. Paste is a fundamental interaction and this library is past 1.0, so a
    // minor release must not silently change what pasting does for every consumer.
    const { host, unmount } = mount(<Composer />);

    const ev = paste(host, WALL);

    expect(ev.defaultPrevented).toBe(false);
    expect(pills(host)).toHaveLength(0);

    unmount();
  });

  it("labels the pill with the character count", () => {
    const { host, unmount } = mount(<Composer pasteThreshold={500} />);

    paste(host, WALL);

    // Thousands separated: sizing it at a glance is the only reason the number is
    // there, and a bare 2036 is harder to size than 2,036.
    expect(pills(host)[0].textContent).toContain("2,036");
    expect(pills(host)[0].textContent?.toLowerCase()).toContain("pasted text");

    unmount();
  });

  it("previews the first and last 20 characters, eliding the middle", () => {
    const { host, unmount } = mount(<Composer pasteThreshold={500} />);

    paste(host, "START" + "x".repeat(2000) + "FINISH");

    const preview = host.querySelector("[data-react-fancy-composer-paste-pill-preview]");

    expect(preview).not.toBeNull();
    expect(preview!.textContent).toContain("START");
    expect(preview!.textContent).toContain("FINISH");
    // The middle is what made it unreadable; the ends say which paste this is.
    expect(preview!.textContent!.length).toBeLessThan(80);

    unmount();
  });

  it("A SEND WITH THE PILL STILL CLOSED CARRIES THE TEXT", () => {
    let submitted: string | null = null;
    const { host, unmount } = mount(
      <Composer pasteThreshold={500} onSubmit={(v) => (submitted = v)} />,
    );

    type(host, "What does this say?");
    paste(host, WALL);

    click(sendButton(host));

    expect(submitted).not.toBeNull();
    expect(submitted!).toContain("What does this say?");
    expect(submitted!).toContain(WALL);

    unmount();
  });

  it("sends held pastes in arrival order, after what was typed", () => {
    // People type the question BEFORE pasting the thing it is about.
    let submitted = "";
    const first = "F".repeat(600);
    const second = "S".repeat(600);
    const { host, unmount } = mount(
      <Composer pasteThreshold={500} onSubmit={(v) => (submitted = v)} />,
    );

    type(host, "question");
    paste(host, first);
    paste(host, second);

    expect(pills(host)).toHaveLength(2);

    click(sendButton(host));

    expect(submitted.indexOf("question")).toBeLessThan(submitted.indexOf(first));
    expect(submitted.indexOf(first)).toBeLessThan(submitted.indexOf(second));

    unmount();
  });

  it("clears the pills after sending, so nothing is sent twice", () => {
    let count = 0;
    let last = "";
    const { host, unmount } = mount(
      <Composer
        pasteThreshold={500}
        onSubmit={(v) => {
          count += 1;
          last = v;
        }}
      />,
    );

    type(host, "one");
    paste(host, WALL);
    click(sendButton(host));

    expect(pills(host)).toHaveLength(0);

    type(host, "two");
    click(sendButton(host));

    expect(count).toBe(2);
    expect(last).not.toContain(WALL);

    unmount();
  });

  it("can send with ONLY a held paste and nothing typed", () => {
    // Send is disabled on an empty value. A held paste IS content, so refusing to
    // send it would strand the paste with no way out but the x.
    let submitted = "";
    const { host, unmount } = mount(
      <Composer pasteThreshold={500} onSubmit={(v) => (submitted = v)} />,
    );

    paste(host, WALL);

    expect(sendButton(host).disabled).toBe(false);

    click(sendButton(host));

    expect(submitted).toContain(WALL);

    unmount();
  });

  it("clicking the pill dumps the text into the input and removes the pill", () => {
    const { host, unmount } = mount(<Composer pasteThreshold={500} />);

    type(host, "before");
    paste(host, WALL);
    click(pills(host)[0]);

    const value = (host.querySelector("textarea") as HTMLTextAreaElement).value;

    // Appended, not replacing - what was typed first stays first.
    expect(value.indexOf("before")).toBe(0);
    expect(value).toContain(WALL);
    expect(pills(host)).toHaveLength(0);

    unmount();
  });

  it("the x discards a paste without inserting it", () => {
    // Without this, the only way to be rid of a paste is to put it in and delete
    // it, which is exactly what the pill exists to avoid.
    let submitted = "";
    const { host, unmount } = mount(
      <Composer pasteThreshold={500} onSubmit={(v) => (submitted = v)} />,
    );

    type(host, "just the question");
    paste(host, WALL);

    click(host.querySelector("[data-react-fancy-composer-paste-pill-remove]"));

    expect(pills(host)).toHaveLength(0);
    expect((host.querySelector("textarea") as HTMLTextAreaElement).value).toBe(
      "just the question",
    );

    click(sendButton(host));

    expect(submitted).toBe("just the question");
    expect(submitted).not.toContain(WALL);

    unmount();
  });

  it("removing one pill leaves the others", () => {
    const a = "A".repeat(600);
    const b = "B".repeat(600);
    const { host, unmount } = mount(<Composer pasteThreshold={500} />);

    paste(host, a);
    paste(host, b);
    click(host.querySelectorAll("[data-react-fancy-composer-paste-pill-remove]")[0]);

    expect(pills(host)).toHaveLength(1);
    expect(pills(host)[0].textContent).toContain("600");

    unmount();
  });

  it("links the pill to its preview, and does not stack two tooltips", () => {
    // A native `title` plus the hover popover renders TWO tooltips on one hover at
    // different delays. And the popover is useless to a screen reader unless it is
    // linked rather than merely adjacent.
    //
    // Neither is visible to this suite as a LAYOUT problem — jsdom has no layout —
    // so these assert the markup that decides it.
    const { host, unmount } = mount(<Composer pasteThreshold={500} />);

    paste(host, WALL);

    const pill = pills(host)[0];
    const preview = host.querySelector("[data-react-fancy-composer-paste-pill-preview]")!;

    expect(pill.getAttribute("title")).toBeNull();
    expect(pill.getAttribute("aria-label")).toContain("2,036");
    expect(pill.getAttribute("aria-describedby")).toBe(preview.id);
    expect(preview.id).not.toBe("");

    unmount();
  });

  it("gives the discard control an accessible name", () => {
    // It renders a bare "x". Without a label it is announced as "x", which is not
    // an action.
    const { host, unmount } = mount(<Composer pasteThreshold={500} />);

    paste(host, WALL);

    const remove = host.querySelector("[data-react-fancy-composer-paste-pill-remove]")!;

    expect(remove.getAttribute("aria-label")).toBeTruthy();

    unmount();
  });

  it("reports held pastes to the host, so an agent can read them", () => {
    // The component contract: no internal-only state for anything an agent might
    // need to read or write.
    const seen: string[][] = [];
    const { host, unmount } = mount(
      <Composer
        pasteThreshold={500}
        onHeldPastesChange={(p) => seen.push(p.map((x) => x.text))}
      />,
    );

    paste(host, WALL);

    expect(seen.at(-1)).toEqual([WALL]);

    unmount();
  });
});

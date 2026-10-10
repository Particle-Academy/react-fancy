// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { PromptInput } from "../src/components/PromptInput/PromptInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COMMAND = "⌘";

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/** Every code point above Latin-1 in the rendered text, with its position. */
function highGlyphs(host: HTMLElement): string[] {
  return [...(host.textContent ?? "")].filter((ch) => ch.codePointAt(0)! > 0xff);
}

/** Every code point above the BMP — the ones needing a dedicated emoji font. */
function astralGlyphs(host: HTMLElement): string[] {
  return [...(host.innerHTML ?? "")].filter((ch) => ch.codePointAt(0)! > 0xffff);
}

/**
 * The hint must name a key the reader HAS.
 *
 * `⌘ + Enter to send` shipped hardcoded, so every Windows and Linux user was
 * told to press a key their keyboard does not have — and in a lean Linux
 * container the glyph had no font behind it either, rendering as a tofu box.
 * Found by a consumer screenshotting a real Electron window; nothing in this
 * suite could see it, because jsdom has no fonts and no platform.
 */
describe("PromptInput names the modifier the platform has", () => {
  it("says Ctrl on a non-Apple platform, and never Command", () => {
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} platform="generic" onSubmit={() => {}} />,
    );

    const hint = host.querySelector("[data-react-fancy-prompt-input-hint]")!;
    expect(hint.getAttribute("data-react-fancy-prompt-input-hint")).toBe("generic");
    expect(hint.textContent).toContain("Ctrl");
    expect(hint.textContent).not.toContain(COMMAND);
    // Not just the hint: the placeholder is the other place it leaked.
    expect(host.querySelector("textarea")!.placeholder).toContain("Ctrl+Enter");
    expect(highGlyphs(host)).toEqual([]);

    unmount();
  });

  it("says Command on Apple", () => {
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} platform="apple" onSubmit={() => {}} />,
    );

    const hint = host.querySelector("[data-react-fancy-prompt-input-hint]")!;
    expect(hint.getAttribute("data-react-fancy-prompt-input-hint")).toBe("apple");
    expect(hint.textContent).toContain(COMMAND);
    expect(host.querySelector("textarea")!.placeholder).toContain(`${COMMAND}+Enter`);
    // The ONE high glyph a Mac is allowed to see, and only there.
    expect(highGlyphs(host)).toEqual([COMMAND]);

    unmount();
  });

  it("defaults to the pressable label when the platform is unknown", () => {
    // jsdom's navigator reports neither macOS nor a Mac UA. The point is that an
    // unresolved platform gets `Ctrl`, which submits on every platform
    // including a Mac — an unresolved `⌘` would be unpressable on most.
    const { host, unmount } = mount(<PromptInput budgetTokens={1000} onSubmit={() => {}} />);

    expect(host.querySelector("[data-react-fancy-prompt-input-hint]")!.textContent).toContain(
      "Ctrl",
    );

    unmount();
  });

  it("still submits on either modifier, whichever one it names", () => {
    // The label changed; the keys did not. A fix that narrowed the handler to
    // match the hint would break submitting on a Mac with Ctrl held.
    for (const platform of ["apple", "generic"] as const) {
      for (const key of ["metaKey", "ctrlKey"] as const) {
        let sent = "";
        const { host, unmount } = mount(
          <PromptInput budgetTokens={1000} platform={platform} onSubmit={(t) => (sent = t)} />,
        );
        const ta = host.querySelector("textarea") as HTMLTextAreaElement;
        // Drive the value through React's own setter, or its value tracker
        // swallows the change and the submit below would fail for the wrong
        // reason. Same helper the Composer and JsonEditor tests use.
        const setValue = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )!.set!;
        act(() => {
          setValue.call(ta, "ship it");
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        });
        // Guard: the meter proves the text reached state. Without it a broken
        // simulation reads exactly like a broken keybinding.
        expect(host.textContent).toContain("2 / 1.0k");
        act(() => {
          ta.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", [key]: true, bubbles: true }),
          );
        });

        expect(sent, `${platform} + ${key}`).toBe("ship it");
        unmount();
      }
    }
  });
});

/**
 * The second finding from the same screenshot: the attach control's icon was a
 * literal 📎. An emoji needs a COLOUR EMOJI FONT, not merely broad coverage, so
 * a lean container renders a tofu box where the affordance should be — and the
 * suite cannot tell, because an emoji in a DOM assertion passes anywhere.
 *
 * So the assertion is not about glyphs rendering. It is that the component
 * contains no astral-plane character at all, which is checkable without fonts.
 */
describe("PromptInput draws its icons, not emoji", () => {
  it("renders no character above the BMP", () => {
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} platform="generic" onSubmit={() => {}} />,
    );

    expect(astralGlyphs(host)).toEqual([]);
    // The affordance is still there — this is not a fix by deletion.
    expect(host.textContent).toContain("attach");
    expect(host.querySelector('input[type="file"]')).not.toBeNull();

    unmount();
  });

  it("renders no astral character on an attachment chip either", () => {
    const { host, unmount } = mount(
      <PromptInput budgetTokens={1000} platform="generic" onSubmit={() => {}} />,
    );

    const target = host.firstElementChild!;
    const ev = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "dataTransfer", {
      value: { files: [new File(["x"], "notes.md", { type: "text/markdown" })] },
    });
    act(() => {
      target.dispatchEvent(ev);
    });

    // Guard: the chip must actually be on screen, or this asserts nothing.
    expect(host.textContent).toContain("notes.md");
    expect(astralGlyphs(host)).toEqual([]);

    unmount();
  });
});

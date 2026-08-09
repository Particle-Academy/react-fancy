// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Kbd } from "../src/components/Kbd/Kbd";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function kbd(el: ReactElement) {
  const { host, unmount } = mount(el);
  const node = host.querySelector("[data-react-fancy-kbd]") as HTMLElement;
  const out = { tag: node.tagName, className: node.className, text: node.textContent ?? "", caps: node.querySelectorAll("span:not([aria-hidden])").length };
  unmount();
  return out;
}

describe("Kbd", () => {
  it("renders a real <kbd>", () => {
    // The whole point of the element. A styled <span> would look identical and
    // mean nothing.
    expect(kbd(<Kbd>K</Kbd>).tag).toBe("KBD");
  });

  it("gives single keys a minimum width", () => {
    // Without it a `K` cap is visibly narrower than an `Esc` beside it, and a
    // row of single letters reads as ragged rather than as keys. This is the
    // detail the six hand-rolled recipes each got differently.
    expect(kbd(<Kbd>K</Kbd>).className).toContain("min-w-");
  });

  it("renders a chord as separate caps inside one kbd", () => {
    // One <kbd> containing per-key caps: a screen reader announces "Cmd + K" as
    // the single shortcut it is, not as two unrelated keys.
    const r = kbd(<Kbd keys={["Cmd", "K"]} />);

    expect(r.tag).toBe("KBD");
    expect(r.caps).toBe(2);
    expect(r.text).toBe("Cmd+K");
  });

  it("hides the chord separator from assistive tech", () => {
    const { host, unmount } = mount(<Kbd keys={["Ctrl", "C"]} />);
    const sep = host.querySelector("[aria-hidden]");

    expect(sep?.textContent).toBe("+");
    unmount();
  });

  it("takes a custom separator", () => {
    expect(kbd(<Kbd keys={["⌘", "K"]} separator="then" />).text).toBe("⌘thenK");
  });

  it("scales without changing what it is", () => {
    for (const size of ["xs", "sm", "md"] as const) {
      const cls = kbd(<Kbd size={size}>K</Kbd>).className;
      expect(cls, `size=${size}`).toContain("font-mono");
      expect(cls, `size=${size}`).toContain("rounded");
    }

    expect(kbd(<Kbd size="xs">K</Kbd>).className).not.toBe(kbd(<Kbd size="md">K</Kbd>).className);
  });

  it("lets a caller override the styling", () => {
    expect(kbd(<Kbd className="sh-kbd">K</Kbd>).className).toContain("sh-kbd");
  });

  it("resets the browser's italic default", () => {
    // Several UA stylesheets italicise <kbd>. Every hand-rolled copy that used
    // a mono font hid this by accident; one that did not, did not.
    expect(kbd(<Kbd>K</Kbd>).className).toContain("not-italic");
  });
});

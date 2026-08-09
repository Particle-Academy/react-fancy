// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Brand } from "../src/components/Brand/Brand";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function markOf(el: ReactElement) {
  const { host, unmount } = mount(el);
  const node = host.querySelector("[data-react-fancy-brand-mark]") as HTMLElement;
  const out = { className: node.className, style: node.style, text: node.textContent, aria: node.getAttribute("aria-hidden") };
  unmount();
  return out;
}

describe("Brand.Mark", () => {
  it("hangs off Brand rather than being a new top-level component", () => {
    expect(Brand.Mark).toBeDefined();
    expect(Object.keys(Brand)).toContain("Mark");
  });

  it("renders its glyph", () => {
    expect(markOf(<Brand.Mark glyph="F" />).text).toBe("F");
  });

  it("ships NO brand colour — the fill is the caller's", () => {
    // A component library inventing your brand gradient would be wrong, and
    // would be the first thing every consumer overrode. Each of the four
    // duplicated copies already pulled its gradient from a token class and
    // hand-rolled only the box, so the box is all this owns.
    const plain = markOf(<Brand.Mark glyph="F" />).className;
    expect(plain).toContain("bg-zinc-900");

    // …and the default loses to a caller's class, which is the whole point.
    const branded = markOf(<Brand.Mark glyph="F" className="brand-gradient" />).className;
    expect(branded).toContain("brand-gradient");
  });

  it("keeps the geometry that was actually duplicated", () => {
    // Fixed square, centred, bold, and shrink-0 so a flex row cannot squash it
    // — the last one is the bug every hand-rolled copy had to remember.
    const cls = markOf(<Brand.Mark glyph="F" />).className;

    for (const c of ["grid", "place-items-center", "shrink-0", "font-bold"]) {
      expect(cls, `missing ${c}`).toContain(c);
    }
  });

  it("takes an exact pixel size when the scale has no step for it", () => {
    // The gallery heading's mark is 30px — between `md` (32) and `sm` (24).
    const m = markOf(<Brand.Mark glyph="F" size={30} />);

    expect(m.style.height).toBe("30px");
    expect(m.style.width).toBe("30px");
    expect(m.style.fontSize).toBe("15px");
  });

  it("uses the named scale when given one, with no inline sizing", () => {
    const m = markOf(<Brand.Mark glyph="F" size="lg" />);

    expect(m.className).toContain("h-11");
    expect(m.style.height).toBe("");
  });

  it("is decorative by default and stops being so when labelled", () => {
    // A mark beside the brand name is redundant to a screen reader; a mark
    // standing alone is not.
    expect(markOf(<Brand.Mark glyph="F" />).aria).toBe("true");
    expect(markOf(<Brand.Mark glyph="F" aria-label="Fancy UI" />).aria).toBeNull();
  });

  it("still works as Brand's logo slot", () => {
    const { host, unmount } = mount(<Brand logo={<Brand.Mark glyph="F" />} name="Fancy UI" />);

    expect(host.querySelector("[data-react-fancy-brand-mark]")).toBeTruthy();
    expect(host.textContent).toContain("Fancy UI");
    unmount();
  });
});

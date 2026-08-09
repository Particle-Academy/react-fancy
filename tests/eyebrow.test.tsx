// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Eyebrow } from "../src/components/Eyebrow/Eyebrow";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function root(el: ReactElement) {
  const { host, unmount } = mount(el);
  const node = host.querySelector("[data-react-fancy-eyebrow]") as HTMLElement;
  const out = { className: node.className, text: node.textContent ?? "", html: node.innerHTML };
  unmount();
  return out;
}

describe("Eyebrow", () => {
  it("renders the num — label running head", () => {
    expect(root(<Eyebrow num="01" label="Selected work" />).text).toBe("01 — Selected work");
  });

  it("emphasises the num rather than colouring it in place", () => {
    // In half the gallery designs the number is the only part of the line that
    // is not muted. A <b> keeps that meaningful when the styling is replaced
    // wholesale, which is what every consumer of this does.
    expect(root(<Eyebrow num="01" label="Work" />).html).toContain("<b");
  });

  it("renders a label with no num, and a num with no label", () => {
    expect(root(<Eyebrow label="Capabilities" />).text).toBe("Capabilities");
    expect(root(<Eyebrow num="02" />).text).toBe("02");
  });

  it("pushes the aside to the far end without centring a lone item", () => {
    // `ml-auto` on the aside, not `justify-between` on the row: with
    // justify-between a single-item eyebrow would drift, and half of them have
    // only one item.
    const withAside = root(<Eyebrow num="00" label="Index" aside="Graphic design studio" />);

    expect(withAside.text).toBe("00 — IndexGraphic design studio");
    expect(withAside.html).toContain("ml-auto");
    expect(root(<Eyebrow label="Alone" />).className).not.toContain("justify-between");
  });

  it("draws the hairline only when asked", () => {
    expect(root(<Eyebrow label="x" rule />).className).toContain("border-b");
    expect(root(<Eyebrow label="x" />).className).not.toContain("border-b");
  });

  it("keeps the arrangement when children replace the pair", () => {
    const r = root(
      <Eyebrow aside="right">
        <span>anything</span>
      </Eyebrow>,
    );

    expect(r.text).toBe("anythingright");
    expect(r.html).not.toContain("<b");
  });

  it("defaults to the mono uppercase running-head look, overridably", () => {
    const cls = root(<Eyebrow label="x" />).className;

    expect(cls).toContain("font-mono");
    expect(cls).toContain("uppercase");
    expect(root(<Eyebrow label="x" className="swiss-eyebrow" />).className).toContain("swiss-eyebrow");
  });
});

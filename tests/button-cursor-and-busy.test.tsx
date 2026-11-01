// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Button } from "../src/components/Button";

/**
 * Reported by Genie while moving its buttons onto Button (5.71.2):
 *
 * 1. Tailwind v4's preflight sets `cursor: default` on <button>, and Button
 *    added no cursor of its own, so an enabled Button showed the arrow.
 * 2. A `loading` Button disabled itself and spun, but never said so to
 *    assistive tech: no `aria-busy`.
 *
 * jsdom does not compute Tailwind, so the cursor is pinned by class. The
 * consumer override is checked on the merged class list, which is what twMerge
 * (via `cn`) produces.
 */
function classesOf(markup: string): string[] {
  const match = markup.match(/class="([^"]*)"/);
  return (match?.[1] ?? "").split(/\s+/).filter(Boolean);
}

function render(node: React.ReactElement): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(node);
  return host.querySelector("[data-react-fancy-button]") as HTMLElement;
}

describe("Button cursor", () => {
  it("gives an enabled button a pointer cursor", () => {
    expect(classesOf(renderToStaticMarkup(<Button>Save</Button>))).toContain("cursor-pointer");
  });

  it("keeps not-allowed for a disabled button", () => {
    const cls = classesOf(renderToStaticMarkup(<Button disabled>Save</Button>));
    expect(cls).toContain("disabled:cursor-not-allowed");
  });

  it("lets a consumer cursor class win", () => {
    const cls = classesOf(renderToStaticMarkup(<Button className="cursor-wait">Save</Button>));
    expect(cls).toContain("cursor-wait");
    expect(cls).not.toContain("cursor-pointer");
  });

  it("gives anchor mode the pointer class too", () => {
    const el = render(<Button href="/docs">Docs</Button>);
    expect(el.tagName).toBe("A");
    expect(el.classList.contains("cursor-pointer")).toBe(true);
  });
});

describe("Button aria-busy", () => {
  it("sets aria-busy=true while loading", () => {
    const el = render(<Button loading>Save</Button>);
    expect(el.getAttribute("aria-busy")).toBe("true");
  });

  it("renders no aria-busy at all when not loading", () => {
    const el = render(<Button>Save</Button>);
    expect(el.hasAttribute("aria-busy")).toBe(false);
    expect(renderToStaticMarkup(<Button>Save</Button>)).not.toContain("aria-busy");
  });

  it("lets a consumer aria-busy prop win", () => {
    const el = render(
      <Button loading aria-busy={false}>
        Save
      </Button>,
    );
    expect(el.getAttribute("aria-busy")).toBe("false");
  });

  it("sets aria-busy on a loading anchor", () => {
    const el = render(
      <Button href="/docs" loading>
        Docs
      </Button>,
    );
    expect(el.tagName).toBe("A");
    expect(el.getAttribute("aria-busy")).toBe("true");
  });

  it("sets aria-busy on a loading circle button", () => {
    const el = render(<Button variant="circle" loading icon="plus" aria-label="Add" />);
    expect(el.getAttribute("aria-busy")).toBe("true");
  });
});

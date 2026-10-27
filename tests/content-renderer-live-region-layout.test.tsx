// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ContentRenderer } from "../src/components/ContentRenderer";
import { click, fakeClipboard, copyButtons, liveRegion, mount } from "./content-renderer-helpers";

/**
 * A visually hidden live region must never add layout — genie#1290.
 *
 * The copy status region was `position: absolute` and nothing around it was
 * positioned, so inside an unpositioned scroll container it escaped the
 * scroller's clip and stretched the DOCUMENT. It also leaned entirely on the
 * host's Tailwind generating `sr-only`; a host that does not scan react-fancy
 * got a visible, unclipped span.
 *
 * jsdom does no layout, so these assert the styles that decide it: the region
 * carries the sr-only clip pattern inline, and every box that holds an absolute
 * child is itself positioned.
 */

const CODE = "Intro\n\n```ts\nconst a = 1;\n```\n";
const TABLE = "| A | B |\n|---|---|\n| 1 | 2 |\n";

function expectVisuallyHidden(el: HTMLElement) {
  const s = el.style;
  expect(s.position).toBe("absolute");
  expect(s.width).toBe("1px");
  expect(s.height).toBe("1px");
  expect(s.padding).toBe("0px");
  expect(s.margin).toBe("-1px");
  expect(s.overflow).toBe("hidden");
  expect(s.clip.replace(/px/g, "").replace(/\s+/g, "")).toBe("rect(0,0,0,0)");
  expect(s.whiteSpace).toBe("nowrap");
  expect(s.borderWidth === "0px" || s.borderWidth === "0").toBe(true);
}

describe("ContentRenderer live region layout", () => {
  it("the root live region carries the sr-only clip pattern inline", () => {
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" />);
    expectVisuallyHidden(liveRegion(host)!);
  });

  it("the root is positioned, so the absolute live region cannot escape it", () => {
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" />);
    const root = host.querySelector<HTMLElement>("[data-react-fancy-content-renderer]")!;
    expect(liveRegion(host)!.parentElement).toBe(root);
    expect(getComputedStyle(root).position).toBe("relative");
  });

  it("leaves a host's own positioning alone (sticky already contains the region)", () => {
    const { host } = mount(<ContentRenderer value={CODE} format="markdown" className="sticky top-0" />);
    const root = host.querySelector<HTMLElement>("[data-react-fancy-content-renderer]")!;
    expect(root.style.position).toBe("");
    expect(root.className).toContain("sticky");
  });

  it("every copy-block wrapper is positioned", () => {
    const { host } = mount(<ContentRenderer value={`${CODE}\n${TABLE}`} format="markdown" />);
    const blocks = Array.from(host.querySelectorAll<HTMLElement>("[data-react-fancy-content-copy-block]"));
    expect(blocks.map((b) => b.getAttribute("data-react-fancy-content-copy-block"))).toEqual(["code", "table"]);
    for (const b of blocks) expect(getComputedStyle(b).position).toBe("relative");
  });

  it("is the only live region, and still announces Copied / Copy failed", async () => {
    fakeClipboard();
    const ok = mount(<ContentRenderer value={CODE} format="markdown" />);
    expect(ok.host.querySelectorAll("[aria-live]")).toHaveLength(1);
    await click(copyButtons(ok.host, "code")[0]);
    expect(liveRegion(ok.host)!.textContent).toBe("Copied");
    expectVisuallyHidden(liveRegion(ok.host)!);

    fakeClipboard({ writeTextFails: true });
    const bad = mount(<ContentRenderer value={CODE} format="markdown" />);
    await click(copyButtons(bad.host, "code")[0]);
    expect(liveRegion(bad.host)!.textContent).toBe("Copy failed");
  });
});

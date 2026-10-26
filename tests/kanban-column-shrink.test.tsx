// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Kanban } from "../src/components/Kanban/Kanban";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Kanban.Column must not shrink.
 *
 * The board is a flex row with `overflow-x-auto`. A column carrying `w-72` but
 * the flex default `flex-shrink: 1` is squeezed (to ~130px in a 400px host)
 * instead of the row scrolling. `shrink-0` is a DEFAULT, merged through `cn`
 * (tailwind-merge), so a consumer className still wins.
 *
 * jsdom does no layout, so these are class assertions; the real width is
 * measured in a browser probe.
 */
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    unmount: () => act(() => root.unmount()),
    columns: () => Array.from(host.querySelectorAll<HTMLElement>("[data-react-fancy-kanban-column]")),
    classes: (el: HTMLElement) => el.className.split(/\s+/),
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Kanban.Column — does not shrink in an overflowing board", () => {
  it("carries shrink-0 by default", () => {
    const view = mount(
      <Kanban>
        <Kanban.Column id="a" title="A" />
        <Kanban.Column id="b" title="B" />
      </Kanban>,
    );
    for (const col of view.columns()) {
      expect(view.classes(col)).toContain("shrink-0");
      expect(view.classes(col)).toContain("w-72");
    }
    view.unmount();
  });

  it("lets a consumer className override width and shrink", () => {
    const view = mount(
      <Kanban>
        <Kanban.Column id="a" title="A" className="w-60" />
        <Kanban.Column id="b" title="B" className="shrink" />
      </Kanban>,
    );
    const [a, b] = view.columns();
    expect(view.classes(a!)).toContain("w-60");
    expect(view.classes(a!)).not.toContain("w-72");
    expect(view.classes(a!)).toContain("shrink-0");
    expect(view.classes(b!)).toContain("shrink");
    expect(view.classes(b!)).not.toContain("shrink-0");
    view.unmount();
  });

  it("the board itself scrolls horizontally", () => {
    const view = mount(
      <Kanban>
        <Kanban.Column id="a" title="A" />
      </Kanban>,
    );
    const board = view.columns()[0]!.parentElement!;
    expect(board.className.split(/\s+/)).toEqual(expect.arrayContaining(["flex", "overflow-x-auto"]));
    view.unmount();
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Progress } from "../src/components/Progress/Progress";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/**
 * The circular Progress must be sizeable — issue #17.
 *
 * `size` was a three-value scale topping out at 64px, written as an INLINE
 * style, with the radius / circumference / dash maths computed in JS from that
 * number. So a consumer wanting a 152px hero ring had no route at all: inline
 * styles beat any stylesheet rule short of `!important` on every property, and
 * even winning that fight would leave the geometry wrong, because `r` and
 * `strokeDasharray` are baked in user units.
 *
 * The reporter built a local `LaunchRing` instead and noted it duplicates the
 * circumference maths and will drift from the kit — which is the real cost of a
 * component that cannot be sized.
 */
describe("Progress circular sizing", () => {
  it("accepts a pixel size", () => {
    const { host, unmount } = mount(<Progress variant="circular" value={50} size={152} />);

    const wrapper = host.querySelector("[data-react-fancy-progress]") as HTMLElement;

    expect(wrapper.style.width).toBe("152px");
    expect(wrapper.style.height).toBe("152px");

    unmount();
  });

  it("accepts an explicit strokeWidth", () => {
    // The reported design: a 152px ring with an 11px stroke.
    const { host, unmount } = mount(
      <Progress variant="circular" value={50} size={152} strokeWidth={11} />,
    );

    const circles = host.querySelectorAll("circle");

    expect(circles.length).toBeGreaterThan(0);
    for (const c of circles) expect(c.getAttribute("stroke-width")).toBe("11");

    unmount();
  });

  it("scales the stroke with the diameter when none is given", () => {
    // A 5px stroke on a 152px ring reads as a hairline. The default has to grow
    // with the circle or the large sizes look broken out of the box.
    const { host, unmount } = mount(<Progress variant="circular" value={50} size={152} />);

    const w = Number(host.querySelector("circle")!.getAttribute("stroke-width"));

    expect(w).toBeGreaterThan(5);

    unmount();
  });

  it("keeps the ring geometry inside the box at any size", () => {
    // r = (diameter - strokeWidth) / 2, so the stroke stays within the viewBox.
    // Getting this wrong clips the ring, which is the failure mode of computing
    // the radius from the diameter alone.
    const { host, unmount } = mount(
      <Progress variant="circular" value={50} size={200} strokeWidth={20} />,
    );

    const c = host.querySelector("circle")!;

    expect(Number(c.getAttribute("r"))).toBe(90);
    expect(Number(c.getAttribute("cx"))).toBe(100);

    unmount();
  });

  it("uses a viewBox so the ring follows its box", () => {
    // Option 2 from the report: with a viewBox the SVG scales to whatever the
    // wrapper ends up being, so CSS sizing works instead of fighting the maths.
    const { host, unmount } = mount(<Progress variant="circular" value={50} size={152} />);

    const svg = host.querySelector("svg")!;

    expect(svg.getAttribute("viewBox")).toBe("0 0 152 152");

    unmount();
  });

  it("sizes the NAMED scale from the stylesheet, not inline styles", () => {
    // So `className` can still override the presets — the escape hatch whose
    // absence made this a blocker rather than an inconvenience.
    //
    // Deliberately NOT Tailwind classes on the element: a consumer who has not
    // `@source`d this package gets no generated utilities, and the ring would
    // render with no size at all. The diameters ship in styles.css keyed off
    // `data-size`, inside `@layer base` so a utility still wins.
    const { host, unmount } = mount(<Progress variant="circular" value={50} size="lg" />);

    const wrapper = host.querySelector("[data-react-fancy-progress]") as HTMLElement;

    expect(wrapper.style.width).toBe("");
    expect(wrapper.getAttribute("data-size")).toBe("lg");

    unmount();
  });

  it("ships a diameter for every named size", () => {
    // Guards the pairing: the component emits `data-size`, and styles.css must
    // have a rule for it. Add a size to one and not the other and the ring
    // silently collapses to zero.
    // Not `new URL(..., import.meta.url)`: under jsdom that is an http: URL and
    // readFileSync rejects it.
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

    for (const size of ["sm", "md", "lg"]) {
      expect(css).toContain(`[data-react-fancy-progress][data-size="${size}"]`);
    }
  });

  it("does not set data-size for a pixel size", () => {
    // Otherwise the stylesheet rule and the inline style would both apply, and
    // the inline one winning would be luck rather than design.
    const { host, unmount } = mount(<Progress variant="circular" value={50} size={152} />);

    const wrapper = host.querySelector("[data-react-fancy-progress]") as HTMLElement;

    expect(wrapper.getAttribute("data-size")).toBeNull();

    unmount();
  });

  it("still renders the named sizes at their documented diameters", () => {
    // Regression guard: sm/md/lg must not move.
    for (const [size, d] of [
      ["sm", 32],
      ["md", 48],
      ["lg", 64],
    ] as const) {
      const { host, unmount } = mount(<Progress variant="circular" value={50} size={size} />);

      expect(host.querySelector("svg")!.getAttribute("viewBox")).toBe(`0 0 ${d} ${d}`);

      unmount();
    }
  });
});

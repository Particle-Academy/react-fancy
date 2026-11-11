// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { DatePicker } from "../src/components/inputs/DatePicker";
import { VideoViewer } from "../src/components/VideoViewer";
import { mount, unmountAll } from "./contrast-assert";
import { installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

/**
 * 6.20.0, K7 and K8 of the full-kit benchmark: DatePicker and VideoViewer
 * showed no focus for part of a keyboard walk.
 *
 * Measured in Chrome 157 (a Tab walk reading the focused element's computed
 * style, as the benchmark does): a native `<input type="date">` takes FOUR Tab
 * stops (month, day, year, then the calendar button) and a `<video controls>`
 * takes one for itself and more for its play / timeline / volume controls.
 * Those inner controls live in the user-agent shadow root. While one of them
 * has focus, the host matches `:focus-within` but NOT `:focus`, so the kit's
 * `focus:ring-*` / the UA `:focus-visible` outline turned off and the field
 * showed nothing. For the video the wrapper's `overflow-hidden rounded-md` also
 * clipped the UA outline, which is drawn outside the element.
 *
 * jsdom has no such shadow root, so the test stands `[data-force-focus-within]`
 * in for `:focus-within` (see `rendered-css.ts`): the element is marked, NOT
 * focused, which is exactly the inner-control state.
 */

afterEach(() => {
  unmountAll();
  removeRenderedCss();
});

/** The ring a Tailwind `ring-*` paints: its width from the ring shadow. */
function ringWidth(el: Element): string | null {
  const shadow = resolveVars(el, getComputedStyle(el).getPropertyValue("--tw-ring-shadow"));
  const m = /0 0 0 calc\((\d+)px/.exec(shadow) ?? /0 0 0 (\d+)px/.exec(shadow);
  return m ? `${m[1]}px` : null;
}

function offsetPx(value: string): number {
  const v = value.trim();
  const product = /^calc\(\s*(-?[\d.]+)px\s*\*\s*(-?[\d.]+)\s*\)$/.exec(v);
  if (product) return Number(product[1]) * Number(product[2]);
  const single = /^calc\(\s*(-?[\d.]+)px\s*\)$/.exec(v);
  return single ? Number(single[1]) : parseFloat(v);
}

async function focusWithin(el: Element) {
  el.setAttribute("data-force-focus-within", "");
  await installRenderedCss({ forceFocusWithin: true });
}

describe("DatePicker keeps its focus ring while an inner control has focus", () => {
  it("single: a 2px ring when only :focus-within matches", async () => {
    const { host } = mount(<DatePicker id="dp" label="Pickup" />);
    const input = host.querySelector("#dp")!;
    await focusWithin(input);
    expect(input.matches(":focus"), "the input itself is not focused").toBe(false);
    expect(ringWidth(input)).toBe("2px");
  });

  it("range: both inputs ring the same way", async () => {
    const { host } = mount(<DatePicker id="dr" range label="Stay" />);
    const inputs = [...host.querySelectorAll('input[type="date"]')];
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      await focusWithin(input);
      expect(ringWidth(input)).toBe("2px");
    }
  });

  it("an errored DatePicker rings red there too, like its :focus ring", () => {
    const { host } = mount(<DatePicker id="de" error="Required" />);
    const cls = host.querySelector("#de")!.className.split(/\s+/);
    expect(cls).toContain("focus:ring-red-500");
    expect(cls).toContain("focus-within:ring-red-500");
  });
});

describe("VideoViewer shows focus on the video and its controls", () => {
  it("an inset 2px solid outline when only :focus-within matches", async () => {
    const { host } = mount(<VideoViewer src="/clip.webm" style={{ height: 200 }} />);
    const video = host.querySelector("video")!;
    await focusWithin(video);
    const st = getComputedStyle(video);
    expect(st.outlineStyle).toBe("solid");
    expect(st.outlineWidth).toBe("2px");
    // Inset, so the wrapper's overflow-hidden cannot clip it.
    // jsdom leaves Tailwind's `calc(2px * -1)` unevaluated; a browser reads -2px.
    expect(offsetPx(st.outlineOffset), `outline-offset ${st.outlineOffset}`).toBeLessThan(0);
    expect(resolveVars(video, st.outlineColor)).not.toBe("");
  });

  it("the outline reads the focus token, light and dark", () => {
    const { host } = mount(<VideoViewer src="/clip.webm" />);
    const cls = host.querySelector("video")!.className.split(/\s+/);
    expect(cls).toContain("focus-within:outline-[color:var(--fancy-focus,var(--color-blue-500))]");
    expect(cls).toContain("dark:focus-within:outline-[color:var(--fancy-focus-dark,var(--color-blue-400))]");
  });
});

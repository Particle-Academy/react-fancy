// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

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
 * Issues #26 and #27, both found putting `<Progress>` on the showcase's player
 * level meter. `ProgressProps` was a CLOSED interface over three nested
 * elements: no rest spread at runtime, no route to the inner two.
 *
 * The two defects are one shape — the component decides everything and the
 * caller cannot reach past the outer wrapper — but they fail differently, so
 * they are pinned separately.
 */
describe("Progress — naming the bar (#26)", () => {
  it("forwards aria-* onto the progressbar element", () => {
    // It announced as "progress bar, 42%". 42% of WHAT was not recoverable from
    // the control: no aria-label, no aria-labelledby, and no rest spread to
    // carry either. Unlike #24 this needed a runtime change, not just a type —
    // nothing was being forwarded at all.
    const { host, unmount } = mount(
      <Progress
        value={1240}
        max={2500}
        aria-label="Progress to Level 6"
        aria-valuetext="1,240 of 2,500 XP to Level 6"
      />,
    );
    const bar = host.querySelector('[role="progressbar"]') as HTMLElement;

    expect(bar.getAttribute("aria-label")).toBe("Progress to Level 6");
    // A percentage is the wrong unit for most real meters, and aria-valuetext
    // is exactly the ARIA escape hatch for a number that is not self-describing.
    expect(bar.getAttribute("aria-valuetext")).toBe("1,240 of 2,500 XP to Level 6");

    unmount();
  });

  it("forwards data-* too, so a meter has a stable handle", () => {
    const { host, unmount } = mount(<Progress value={42} data-testid="level-meter" />);
    const bar = host.querySelector('[role="progressbar"]') as HTMLElement;

    expect(bar.getAttribute("data-testid")).toBe("level-meter");

    unmount();
  });

  it("names the circular variant as well", () => {
    // Same component, same closed props — the ring was equally anonymous.
    const { host, unmount } = mount(
      <Progress variant="circular" value={42} aria-label="Upload progress" />,
    );

    expect(
      (host.querySelector('[role="progressbar"]') as HTMLElement).getAttribute("aria-label"),
    ).toBe("Upload progress");

    unmount();
  });
});

describe("Progress — styling the track and the fill (#27)", () => {
  it("lets a caller reach the track and the fill", () => {
    // `className` landed only on the outermost of three elements. The track
    // (`bg-zinc-200`) and the fill (`progressFill[color]`) were internal, and
    // `color` takes one palette name — so the showcase's brand GRADIENT was not
    // expressible and the meter shipped a solid colour instead.
    //
    // The alternative a consumer reaches for is
    // `className="[&>div>div]:bg-[...]"`, which hard-codes another package's DOM
    // shape and breaks silently — still rendering, just unstyled — the first
    // time Progress gains a wrapper.
    const { host, unmount } = mount(
      <Progress value={42} trackClassName="bg-brand-track" fillClassName="bg-brand-fill" />,
    );

    expect(host.querySelector(".bg-brand-track")).not.toBeNull();
    expect(host.querySelector(".bg-brand-fill")).not.toBeNull();

    unmount();
  });

  it("applies them to the ring's two circles in the circular variant", () => {
    // The circular equivalents are the two <circle>s. Naming the props after the
    // ROLE rather than the element keeps one vocabulary across both variants.
    const { host, unmount } = mount(
      <Progress
        variant="circular"
        value={42}
        trackClassName="stroke-brand-track"
        fillClassName="stroke-brand-fill"
      />,
    );

    expect(host.querySelector(".stroke-brand-track")).not.toBeNull();
    expect(host.querySelector(".stroke-brand-fill")).not.toBeNull();

    unmount();
  });

  it("still applies the built-in colour when nothing overrides it", () => {
    // Guards the guard: the new props are additive, so an existing caller must
    // keep the palette fill it already had.
    const { host, unmount } = mount(<Progress value={42} color="emerald" />);
    const fill = host.querySelector('[role="progressbar"] > div > div') as HTMLElement;

    expect(fill.className).toMatch(/emerald/);

    unmount();
  });
});

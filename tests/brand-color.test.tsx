// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Badge, Button, Callout, Progress, Switch, Timeline } from "../src";
import { COLORS } from "../src/utils/types";
import { buttonColorClasses, buttonGhostClasses } from "../src/components/Button/Button.colors";
import { badgeDot, badgeOutline, badgeSoft, badgeSolid } from "../src/components/Badge/Badge.colors";
import { calloutContainer, calloutIcon } from "../src/components/Callout/Callout.colors";
import { progressFill, progressStroke, progressText } from "../src/components/Progress/Progress.colors";
import { switchTrack } from "../src/components/inputs/Switch/Switch.colors";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no IntersectionObserver and Timeline observes its items. Stubbed
// rather than skipped: the assertion here is about which CLASSES render, and
// that does not depend on the observer ever firing.
class StubIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "";
  thresholds = [];
}
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = StubIO;

/**
 * `color="brand"` — pointing a component at the HOST's colour.
 *
 * react-fancy#29's sibling, #30, reported from a consumer with 164 call sites
 * reading `color="violet"` to mean "our primary action". Their brand is navy,
 * so every one of those buttons was indigo-ish. `ButtonColor` was a closed
 * union of the 22 Tailwind hue names, with no `brand` and no escape hatch.
 *
 * `--color-brand` already existed in `styles.css` and no component read it.
 * That is not quite "wired to nothing": Tailwind v4's `@theme` GENERATES
 * `bg-brand` / `text-brand` utilities from it, so a host could already paint
 * its OWN markup. The gap was one-directional — nothing in the kit could be
 * pointed at it.
 *
 * THREE variables rather than one, and this is the part that decides the
 * design. A generated hover assumes "same hue, darker". A brand palette need
 * not work that way: the reporter's hover is GOLD on a navy brand, which no
 * amount of arithmetic recovers from navy. So the host states the hover.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

const ALL_MAPS = {
  buttonColorClasses, buttonGhostClasses,
  badgeSolid, badgeOutline, badgeSoft, badgeDot,
  calloutContainer, calloutIcon,
  progressFill, progressStroke, progressText,
  switchTrack,
};

describe("color=\"brand\"", () => {
  it("every colour map carries a brand entry", () => {
    // TypeScript already enforces this for the maps that exist today. This is
    // the guard for the NEXT map someone adds: a Record<Color, string> written
    // against a stale Color would compile and then render nothing for brand.
    for (const [name, map] of Object.entries(ALL_MAPS)) {
      expect(map, name).toHaveProperty("brand");
      expect((map as Record<string, string>).brand, name).toMatch(/brand/);
    }
  });

  it("is a member of Color and of the COLORS list", () => {
    // The two disagreeing is how an exhaustive map ends up missing a case.
    expect(COLORS).toContain("brand");
  });

  it("declares all three brand variables, so a host sets them once", () => {
    const css = readFileSync(resolve(__dirname, "../src/styles.css"), "utf8");
    expect(css).toMatch(/--color-brand:/);
    expect(css).toMatch(/--color-brand-contrast:/);
    expect(css).toMatch(/--color-brand-hover:/);
  });

  it("resolves hover from its OWN variable, never a shade of brand", () => {
    // The reporter's hover is gold on navy. A solid button whose hover class
    // were `hover:bg-brand-700` or similar would silently be unable to express
    // that, and would look correct in every palette where hover IS darker.
    expect(buttonColorClasses.brand).toContain("hover:bg-brand-hover");
    expect(buttonColorClasses.brand).not.toMatch(/hover:bg-brand-\d/);
  });

  it("puts text on solid surfaces via brand-contrast, not a guessed white", () => {
    expect(buttonColorClasses.brand).toContain("text-brand-contrast");
    expect(badgeSolid.brand).toContain("text-brand-contrast");
  });

  it("renders brand classes on every component that takes a color", () => {
    const cases: Array<[string, ReactElement]> = [
      ["Button", <Button color="brand">Go</Button>],
      ["Badge", <Badge color="brand">New</Badge>],
      ["Callout", <Callout color="brand">Heads up</Callout>],
      ["Progress", <Progress color="brand" value={40} />],
      ["Switch", <Switch color="brand" checked onChange={() => {}} />],
      [
        "Timeline",
        <Timeline>
          <Timeline.Item color="brand" title="Shipped" />
        </Timeline>,
      ],
    ];

    for (const [name, el] of cases) {
      const { host, unmount } = mount(el);
      expect(host.innerHTML, name).toMatch(/brand/);
      unmount();
    }
  });

  it("leaves the hue colours untouched", () => {
    // Adding a union member must not perturb what every existing consumer uses.
    const { host, unmount } = mount(<Button color="violet">Go</Button>);
    expect(host.innerHTML).toContain("violet");
    expect(host.innerHTML).not.toContain("brand");
    unmount();
  });
});

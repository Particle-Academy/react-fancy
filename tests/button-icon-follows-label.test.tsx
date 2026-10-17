// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Button } from "../src/components/Button";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

function mount(el: ReactElement): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

/** The span wrapping the icon (the icon itself loads lazily, so find the wrapper). */
const iconWrap = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-action-icon]")!;
const badge = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-action-badge]")!;

/**
 * react-fancy#34, from the MOIC estate. On a coloured Button the label follows
 * the colour's own text class — `text-brand-contrast` for brand — but the icon
 * and badge were hard-coded `text-white`. A host that swaps the brand pair in
 * dark mode (pale blue with navy contrast) got a navy label beside a WHITE icon
 * on pale blue: nearly invisible.
 *
 * It was not only brand: amber, yellow and lime buttons have dark labels
 * (`text-*-950`) and had white icons on yellow on every host.
 */
describe("Button — icon and badge follow the label colour", () => {
  for (const color of ["brand", "amber", "yellow", "lime", "blue"] as const) {
    it(`${color}: the icon inherits the button's text colour`, () => {
      const host = mount(
        <Button color={color} icon="plus">
          New
        </Button>,
      );

      expect(iconWrap(host).className).toContain("text-current");
      expect(iconWrap(host).className).not.toContain("text-white");
    });

    it(`${color}: the badge does too`, () => {
      const host = mount(
        <Button color={color} badge="3">
          Inbox
        </Button>,
      );

      expect(badge(host).className).toContain("text-current");
      expect(badge(host).className).not.toContain("text-white");
    });
  }

  it("active and checked buttons follow their label too", () => {
    for (const props of [{ active: true }, { checked: true }]) {
      const host = mount(
        <Button {...props} icon="plus">
          On
        </Button>,
      );
      expect(iconWrap(host).className).toContain("text-current");
    }
  });

  it("renders a badge ONCE, leading unless badgeTrailing says otherwise", () => {
    // `badgeTrailing ?? trailing` was true in both the leading and trailing
    // passes when the prop was unset, so every badge rendered twice — seen while
    // checking this fix in a browser.
    const leading = mount(<Button badge="3">Inbox</Button>);
    const leadingBadges = leading.querySelectorAll("[data-action-badge]");
    expect(leadingBadges).toHaveLength(1);
    expect(leading.querySelector("button")!.textContent).toBe("3Inbox");

    const trailing = mount(
      <Button badge="3" badgeTrailing>
        Inbox
      </Button>,
    );
    expect(trailing.querySelectorAll("[data-action-badge]")).toHaveLength(1);
    expect(trailing.querySelector("button")!.textContent).toBe("Inbox3");
  });

  it("renders an avatar ONCE as well", () => {
    const host = mount(<Button avatar="/a.png">Ada</Button>);

    expect(host.querySelectorAll("[data-action-avatar]")).toHaveLength(1);
  });

  it("an uncoloured button keeps its muted icon", () => {
    const host = mount(<Button icon="plus">Plain</Button>);

    expect(iconWrap(host).className).toContain("text-zinc-500");
  });
});

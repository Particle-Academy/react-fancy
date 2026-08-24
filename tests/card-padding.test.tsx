// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Card } from "../src/components/Card/Card";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/**
 * Turn Card's arbitrary-variant padding classes back into the CSS selectors
 * they compile to, so a test can ask the real question — "would this element
 * be padded?" — instead of string-matching a class name.
 *
 * `[&>div]:px-4` compiles to `.card > div`, so the part inside the brackets IS
 * the selector with `&` standing in for the card.
 */
function paddingSelectors(cardClass: string): string[] {
  return cardClass
    .split(/\s+/)
    .map((c) => /^\[(.+?)\]:p[xy]-/.exec(c)?.[1])
    .filter((s): s is string => Boolean(s))
    .map((s) => s.replace(/_/g, " ").replace(/&/g, "[data-react-fancy-card]"));
}

describe("Card padding reaches every child", () => {
  it("pads a <p> child, not only <div> children", () => {
    // THE BUG. `padding` compiled to `[&>div]:px-4`, so padding landed on
    // whichever children happened to be divs and silently skipped every other
    // tag. On the showcase's /packages page that put the description <p> and
    // the footer <span> hard against the card border while the <div> header
    // and thumbnail strip beside them were correctly inset -- a card that
    // looked half-padded, with nothing in the consumer's own code to explain
    // why. Nobody writing <Card><p>…</p></Card> can be expected to know that
    // the tag they chose decides whether the card has padding.
    const { host, unmount } = mount(
      <Card>
        <div data-testid="d">head</div>
        <p data-testid="p">line</p>
        <span data-testid="s">act</span>
        <ul data-testid="u"><li>x</li></ul>
      </Card>,
    );

    const card = host.firstElementChild as HTMLElement;
    const selectors = paddingSelectors(card.className);
    expect(selectors, "Card must emit padding selectors").not.toHaveLength(0);

    const covered = (id: string) => {
      const el = host.querySelector(`[data-testid="${id}"]`)!;
      return selectors.some((sel) => el.matches(sel));
    };

    expect(covered("d"), "<div> child").toBe(true);
    expect(covered("p"), "<p> child").toBe(true);
    expect(covered("s"), "<span> child").toBe(true);
    expect(covered("u"), "<ul> child").toBe(true);
    unmount();
  });

  it("still pads only DIRECT children", () => {
    // The fix widens which tags are padded, never how deep it reaches. A
    // nested element must not collect a second inset.
    const { host, unmount } = mount(
      <Card>
        <div><p data-testid="deep">nested</p></div>
      </Card>,
    );

    const card = host.firstElementChild as HTMLElement;
    const selectors = paddingSelectors(card.className);
    const deep = host.querySelector('[data-testid="deep"]')!;

    expect(selectors.some((sel) => deep.matches(sel))).toBe(false);
    unmount();
  });

  it("keeps every size and lets padding='none' mean none", () => {
    for (const [size, px] of [["sm", "px-3"], ["md", "px-4"], ["lg", "px-6"]] as const) {
      const { host, unmount } = mount(<Card padding={size}><p data-testid="p">x</p></Card>);
      const card = host.firstElementChild as HTMLElement;

      expect(card.className, `padding="${size}"`).toContain(px);
      expect(
        paddingSelectors(card.className).some((sel) => host.querySelector('[data-testid="p"]')!.matches(sel)),
        `padding="${size}" must reach a <p>`,
      ).toBe(true);
      unmount();
    }

    const none = mount(<Card padding="none"><p>x</p></Card>);
    expect(paddingSelectors((none.host.firstElementChild as HTMLElement).className)).toHaveLength(0);
    none.unmount();
  });

  it("leaves Card.Media flush against the edge", () => {
    // Media opted out with `!px-0 !py-0` back when the selector was
    // `[&>div]`. Widening the selector must not start insetting it -- the
    // escape hatch is what full-bleed children are supposed to use, and it
    // has to keep working now that it is reachable from any tag.
    const { host, unmount } = mount(
      <Card padding="lg">
        <Card.Media background="#000" />
      </Card>,
    );
    const cls = (host.querySelector("[data-react-fancy-card-media]") as HTMLElement).className;

    expect(cls).toContain("!px-0");
    expect(cls).toContain("!py-0");
    unmount();
  });
});

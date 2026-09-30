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

function classesOf(host: HTMLElement, handle: string): string {
  return host.querySelector(`[${handle}]`)?.className ?? "";
}

/*
 * Card grew a header/footer composition API, a `sections` treatment, a `size`
 * step and two tint variants. Everything here is ADDITIVE, and the first
 * describe block is the one that matters most: a Card written before this
 * release must render byte-identically. `card-padding.test.tsx` and
 * `card-media.test.tsx` already pin the old behaviour from the other side.
 */

describe("nothing changes for a Card written before this release", () => {
  it("keeps rounded-lg and md padding when no size is given", () => {
    const { host, unmount } = mount(<Card>body</Card>);
    const cls = classesOf(host, "data-react-fancy-card");

    expect(cls).toContain("rounded-lg");
    expect(cls).toContain("[&>*]:px-4");
    expect(cls).toContain("[&>*]:py-3");

    unmount();
  });

  it("keeps the header rule and the footer rule by default", () => {
    // `sections` defaults to "divided" precisely so this stays true. A
    // seamless default would have been the nicer design and would also have
    // silently restyled every card in every consumer.
    const { host, unmount } = mount(
      <Card>
        <Card.Header>h</Card.Header>
        <Card.Body>b</Card.Body>
        <Card.Footer>f</Card.Footer>
      </Card>,
    );

    expect(classesOf(host, "data-react-fancy-card-header")).toContain("border-b");
    expect(classesOf(host, "data-react-fancy-card-footer")).toContain("border-t");

    unmount();
  });

  it("does not add a highlight unless asked", () => {
    const { host, unmount } = mount(<Card>body</Card>);
    // Flux turns its equivalent ON by default. Copying that default would have
    // changed the look of every card in the suite for a decorative hairline.
    expect(classesOf(host, "data-react-fancy-card")).not.toContain("inset");
    unmount();
  });

  it("still renders plain children in header and footer", () => {
    const { host, unmount } = mount(
      <Card>
        <Card.Header>
          <span data-testid="custom">hand-rolled</span>
        </Card.Header>
      </Card>,
    );

    expect(host.querySelector('[data-testid="custom"]')?.textContent).toBe("hand-rolled");
    unmount();
  });
});

describe("header composition", () => {
  it("renders heading, description and actions", () => {
    const { host, unmount } = mount(
      <Card>
        <Card.Header heading="Billing" description="Cards and invoices" actions={<button>Edit</button>} />
      </Card>,
    );

    expect(host.querySelector("[data-react-fancy-card-heading]")?.textContent).toBe("Billing");
    expect(host.querySelector("[data-react-fancy-card-description]")?.textContent).toBe("Cards and invoices");
    expect(host.querySelector("[data-react-fancy-card-actions]")?.textContent).toBe("Edit");

    unmount();
  });

  it("takes plain strings, so an agent can emit the whole header as props", () => {
    // The authoring-surface half of the component contract: a header must be
    // expressible without children, or an agent has to emit JSX to set a title.
    const { host, unmount } = mount(
      <Card>
        <Card.Header heading="Just a string" />
      </Card>,
    );

    expect(host.querySelector("[data-react-fancy-card-heading]")?.textContent).toBe("Just a string");
    unmount();
  });

  it("renders a real heading element at the level asked for", () => {
    const { host, unmount } = mount(
      <Card>
        <Card.Header heading="Section" headingLevel="h3" />
      </Card>,
    );

    expect(host.querySelector("[data-react-fancy-card-heading]")?.tagName).toBe("H3");
    unmount();
  });

  it("children WIN over heading/description/actions rather than stacking with them", () => {
    // Ambiguous input resolved one way, loudly, in one place. Rendering both
    // would double a title for anyone who passed each by mistake.
    const { host, unmount } = mount(
      <Card>
        <Card.Header heading="ignored">
          <span data-testid="own">mine</span>
        </Card.Header>
      </Card>,
    );

    expect(host.querySelector('[data-testid="own"]')).not.toBeNull();
    expect(host.querySelector("[data-react-fancy-card-heading]")).toBeNull();
    unmount();
  });

  it("lays actions out at the end without a wrapper from the caller", () => {
    // This is the gap that had two showcase pages writing
    // `<div style={{display:"flex",justifyContent:"space-between"}}>` INSIDE a
    // Card.Header -- inline styles, in the app that demonstrates the kit.
    const { host, unmount } = mount(
      <Card>
        <Card.Header heading="h" actions={<button>a</button>} />
      </Card>,
    );

    const header = host.querySelector("[data-react-fancy-card-header]")!;
    expect(header.className).toContain("flex");
    expect(header.className).toContain("justify-between");
    unmount();
  });

  it("gives the footer the same three props, aligned to the end", () => {
    const { host, unmount } = mount(
      <Card>
        <Card.Footer heading="Total" description="inc. VAT" actions={<button>Pay</button>} />
      </Card>,
    );

    expect(host.querySelector("[data-react-fancy-card-heading]")?.textContent).toBe("Total");
    expect(host.querySelector("[data-react-fancy-card-actions]")?.textContent).toBe("Pay");
    unmount();
  });
});

describe("sections", () => {
  it("plain drops both rules", () => {
    const { host, unmount } = mount(
      <Card sections="plain">
        <Card.Header>h</Card.Header>
        <Card.Footer>f</Card.Footer>
      </Card>,
    );

    expect(classesOf(host, "data-react-fancy-card-header")).not.toContain("border-b");
    expect(classesOf(host, "data-react-fancy-card-footer")).not.toContain("border-t");
    unmount();
  });

  it("banded tints the header and footer instead of ruling them", () => {
    const { host, unmount } = mount(
      <Card sections="banded">
        <Card.Header>h</Card.Header>
        <Card.Footer>f</Card.Footer>
      </Card>,
    );

    const header = classesOf(host, "data-react-fancy-card-header");
    expect(header).toContain("bg-zinc-50");
    expect(header).not.toContain("border-b");
    unmount();
  });

  it("dividerInset stops the rule short of the card's edge", () => {
    const { host, unmount } = mount(
      <Card dividerInset>
        <Card.Header>h</Card.Header>
      </Card>,
    );

    const header = classesOf(host, "data-react-fancy-card-header");
    // Drawn as a pseudo-element inset from the sides, because a `border-b` on
    // a full-width child cannot stop short of that child's own edges.
    expect(header).toContain("after:");
    expect(header).not.toContain("border-b");
    unmount();
  });

  it("is read from context, so a nested header does not need the prop", () => {
    const { host, unmount } = mount(
      <Card sections="plain">
        <Card.Body>
          <Card.Header>sub-section</Card.Header>
        </Card.Body>
      </Card>,
    );

    expect(classesOf(host, "data-react-fancy-card-header")).not.toContain("border-b");
    unmount();
  });
});

describe("size", () => {
  it("scales padding and corner radius together", () => {
    const { host: xs, unmount: u1 } = mount(<Card size="xs">b</Card>);
    expect(classesOf(xs, "data-react-fancy-card")).toContain("[&>*]:px-2");
    expect(classesOf(xs, "data-react-fancy-card")).toContain("rounded");
    u1();

    const { host: lg, unmount: u2 } = mount(<Card size="lg">b</Card>);
    expect(classesOf(lg, "data-react-fancy-card")).toContain("[&>*]:px-6");
    expect(classesOf(lg, "data-react-fancy-card")).toContain("rounded-xl");
    u2();
  });

  it("lets an explicit padding win over the size's default", () => {
    // `size` sets the DEFAULT padding step. Keeping `padding` authoritative is
    // what stops this being a breaking change for anyone already passing it.
    const { host, unmount } = mount(
      <Card size="lg" padding="none">
        b
      </Card>,
    );

    const cls = classesOf(host, "data-react-fancy-card");
    expect(cls).not.toContain("px-6");
    expect(cls).not.toContain("px-4");
    unmount();
  });
});

describe("variant tint ramp", () => {
  it("adds muted and soft between outlined and flat", () => {
    const { host: m, unmount: u1 } = mount(<Card variant="muted">b</Card>);
    expect(classesOf(m, "data-react-fancy-card")).toContain("bg-zinc-100");
    u1();

    const { host: s, unmount: u2 } = mount(<Card variant="soft">b</Card>);
    expect(classesOf(s, "data-react-fancy-card")).toContain("bg-zinc-50/70");
    u2();
  });

  it("keeps the three original variant names working", () => {
    // `flat` is NOT renamed to Flux's `filled`. The name is public API and a
    // rename buys nothing.
    for (const variant of ["outlined", "elevated", "flat"] as const) {
      const { host, unmount } = mount(<Card variant={variant}>b</Card>);
      expect(classesOf(host, "data-react-fancy-card")).not.toBe("");
      unmount();
    }
  });
});

describe("standalone header and footer", () => {
  it("renders without a Card and without a stray rule", () => {
    // Flux allows a header above a card as a section heading. Ours rendered,
    // but carried a border-bottom that belongs to a card it was not inside.
    const { host, unmount } = mount(<Card.Header heading="Above the card" />);

    const header = host.querySelector("[data-react-fancy-card-header]")!;
    expect(header.className).not.toContain("border-b");
    expect(host.querySelector("[data-react-fancy-card-heading]")?.textContent).toBe("Above the card");
    unmount();
  });

  it("takes its own size when there is no card to inherit from", () => {
    const { host, unmount } = mount(<Card.Header heading="h" size="lg" />);
    expect(classesOf(host, "data-react-fancy-card-header")).toContain("px-6");
    unmount();
  });
});

describe("highlight", () => {
  it("adds an inset top hairline when asked", () => {
    const { host, unmount } = mount(<Card highlight>b</Card>);
    expect(classesOf(host, "data-react-fancy-card")).toContain("inset");
    unmount();
  });
});

describe("Card.Bleed", () => {
  it("cancels the card's child padding so content reaches the sides", () => {
    const { host, unmount } = mount(
      <Card>
        <Card.Body>
          <Card.Bleed>
            <img alt="" />
          </Card.Bleed>
        </Card.Body>
      </Card>,
    );

    // md padding is px-4, so escaping it is -mx-4. Derived from the size step
    // rather than a CSS-variable protocol -- see the note in Card.Bleed.
    expect(classesOf(host, "data-react-fancy-card-bleed")).toContain("-mx-4");
    unmount();
  });

  it("tracks the card's size", () => {
    const { host, unmount } = mount(
      <Card size="lg">
        <Card.Body>
          <Card.Bleed>x</Card.Bleed>
        </Card.Body>
      </Card>,
    );

    expect(classesOf(host, "data-react-fancy-card-bleed")).toContain("-mx-6");
    unmount();
  });

  it("rounds only the corners it actually touches", () => {
    const { host, unmount } = mount(
      <Card>
        <Card.Body>
          <Card.Bleed edges="top">x</Card.Bleed>
        </Card.Body>
      </Card>,
    );

    const cls = classesOf(host, "data-react-fancy-card-bleed");
    expect(cls).toContain("-mt-");
    expect(cls).toContain("rounded-t-");
    expect(cls).not.toContain("rounded-b-");
    unmount();
  });

  it("reaches the sides only, by default", () => {
    const { host, unmount } = mount(
      <Card>
        <Card.Body>
          <Card.Bleed>x</Card.Bleed>
        </Card.Body>
      </Card>,
    );

    const cls = classesOf(host, "data-react-fancy-card-bleed");
    expect(cls).not.toContain("-mt-");
    expect(cls).not.toContain("-mb-");
    unmount();
  });

  it("as a DIRECT child of Card it zeroes its own padding instead", () => {
    // Bleed cannot know its own depth from a single context, so Header/Body/
    // Footer publish one saying "you are inside a padded section". Without it,
    // Bleed IS the padded element, and negative margins would pull it clean
    // outside the card rather than to its edge.
    const { host, unmount } = mount(
      <Card>
        <Card.Bleed>x</Card.Bleed>
      </Card>,
    );

    const cls = classesOf(host, "data-react-fancy-card-bleed");
    expect(cls).toContain("px-0");
    expect(cls).not.toContain("-mx-");
    unmount();
  });
});

/*
 * Added by the adversarial review of the block above. Every test here FAILS
 * against the first implementation: it keyed the divider inset and the bleed
 * distance off `size`, which is only the DEFAULT padding step, and suppressed
 * the section context when there was no card.
 */
describe("the distance follows the padding, not the size", () => {
  it("insets the divider by the padding actually applied", () => {
    // `size="md"` implies px-4, but `padding` overrides it. A rule inset by
    // 1rem over content inset by 1.5rem is not a prop conflict to the eye --
    // it reads as a rendering bug.
    const { host, unmount } = mount(
      <Card padding="lg" dividerInset>
        <Card.Header>h</Card.Header>
      </Card>,
    );

    const header = classesOf(host, "data-react-fancy-card-header");
    expect(header).toContain("after:inset-x-6");
    expect(header).not.toContain("after:inset-x-4");
    unmount();
  });

  it("bleeds back out by the padding actually applied", () => {
    const { host, unmount } = mount(
      <Card size="md" padding="lg">
        <Card.Body>
          <Card.Bleed>x</Card.Bleed>
        </Card.Body>
      </Card>,
    );

    const cls = classesOf(host, "data-react-fancy-card-bleed");
    expect(cls).toContain("-mx-6");
    expect(cls).not.toContain("-mx-4");
    unmount();
  });

  it("bleeds by NOTHING when there is no padding to escape", () => {
    // The worst of the three: with `padding="none"` a size-derived `-mx-4`
    // does not reach the card's edge, it travels a centimetre PAST it and
    // hangs the content outside the border.
    const { host, unmount } = mount(
      <Card padding="none">
        <Card.Body>
          <Card.Bleed>x</Card.Bleed>
        </Card.Body>
      </Card>,
    );

    expect(classesOf(host, "data-react-fancy-card-bleed")).not.toContain("-mx-");
    unmount();
  });

  it("bleeds inside a STANDALONE header, which pads itself", () => {
    // A card-less header applies its own `px-6`, so the padding is still on
    // the section and escaping it is still a negative margin. Keying the
    // section context on "is there a card" made this a no-op instead.
    const { host, unmount } = mount(
      <Card.Header size="lg">
        <Card.Bleed>x</Card.Bleed>
      </Card.Header>,
    );

    const cls = classesOf(host, "data-react-fancy-card-bleed");
    expect(cls).toContain("-mx-6");
    expect(cls).not.toContain("px-0");
    unmount();
  });
});

describe("highlight is visible in both modes", () => {
  it("carries a real colour under dark, not transparent", () => {
    // It was `dark:before:bg-transparent`: the prop did nothing at all in the
    // mode that needs it most -- a dark surface has no border contrast of its
    // own, which is why Flux turns its equivalent on by default.
    const cls = (() => {
      const { host, unmount } = mount(<Card variant="flat" highlight>b</Card>);
      const c = classesOf(host, "data-react-fancy-card");
      unmount();
      return c;
    })();

    expect(cls).toContain("dark:before:bg-white/10");
    expect(cls).not.toContain("dark:before:bg-transparent");
  });

  it("coexists with elevated rather than deleting its shadow", () => {
    // The reason it is a pseudo-element: `shadow-md` and `shadow-[inset...]`
    // are one tailwind-merge group, so an inset shadow would have silently
    // won and left `elevated` flat.
    const { host, unmount } = mount(<Card variant="elevated" highlight>b</Card>);
    const cls = classesOf(host, "data-react-fancy-card");

    expect(cls).toContain("shadow-md");
    expect(cls).toContain("before:h-px");
    unmount();
  });
});

describe("variant beats the base background", () => {
  it.each(["flat", "muted", "soft"] as const)("%s removes bg-white through tailwind-merge", (variant) => {
    // `cn` is tailwind-merge: the tint wins because it comes LATER in the
    // class string, not because of specificity. If the order in Card.tsx ever
    // flips, the tint survives in the string and loses in the browser.
    const { host, unmount } = mount(<Card variant={variant}>b</Card>);
    const cls = classesOf(host, "data-react-fancy-card").split(/\s+/);

    expect(cls).not.toContain("bg-white");
    expect(cls).not.toContain("dark:bg-zinc-900");
    unmount();
  });

  it("keeps bg-white on the untinted variants", () => {
    for (const variant of ["outlined", "elevated"] as const) {
      const { host, unmount } = mount(<Card variant={variant}>b</Card>);
      expect(classesOf(host, "data-react-fancy-card").split(/\s+/)).toContain("bg-white");
      unmount();
    }
  });
});

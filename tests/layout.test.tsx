// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Container } from "../src/components/Container/Container";
import { Section } from "../src/components/Section/Section";
import { Grid } from "../src/components/Grid/Grid";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/**
 * Layout primitives — issue #170, task 228.
 *
 * Called the highest-leverage gap the gallery found, and the evidence is that
 * all twenty Swiss-family styles hand-rolled the same three things: a page
 * container with a max width, section rhythm, and a modular grid.
 *
 * The obvious objection is that Tailwind already has `max-w-*`, `py-*` and
 * `grid-cols-*`, so why own an API surface for it. The answer is in the report:
 * what got hand-rolled was not the utilities, it was the DECISIONS — which max
 * width, which rhythm, which breakpoints — repeated twenty times and drifting.
 * These components own the decision and leave the styling replaceable, which is
 * the same split `Eyebrow` already makes.
 */
describe("Container", () => {
  it("centres and constrains, and can be widened", () => {
    const { host, unmount } = mount(<Container>x</Container>);
    const el = host.querySelector("[data-react-fancy-container]") as HTMLElement;

    expect(el.className).toMatch(/mx-auto/);
    expect(el.getAttribute("data-size")).toBe("md");

    unmount();

    const wide = mount(<Container size="full">x</Container>);
    expect(
      wide.host.querySelector("[data-react-fancy-container]")?.getAttribute("data-size"),
    ).toBe("full");
    wide.unmount();
  });

  it("renders the element it is told to", () => {
    // A container is frequently a <main> or a <header>; forcing a <div> makes
    // the consumer wrap it and defeats the point.
    const { host, unmount } = mount(<Container as="main">x</Container>);

    expect(host.querySelector("main")).not.toBeNull();

    unmount();
  });
});

describe("Section", () => {
  it("defaults to a <section> and carries rhythm", () => {
    const { host, unmount } = mount(<Section>x</Section>);
    const el = host.querySelector("[data-react-fancy-section]") as HTMLElement;

    expect(el.tagName).toBe("SECTION");
    expect(el.getAttribute("data-space")).toBe("md");

    unmount();
  });

  it("takes a divider without the caller drawing one", () => {
    const { host, unmount } = mount(<Section divider>x</Section>);

    expect(
      host.querySelector("[data-react-fancy-section]")?.className,
    ).toMatch(/border-t/);

    unmount();
  });
});

describe("Grid", () => {
  it("lays out the requested columns", () => {
    const { host, unmount } = mount(<Grid cols={3}>x</Grid>);
    const el = host.querySelector("[data-react-fancy-grid]") as HTMLElement;

    expect(el.className).toMatch(/\bgrid\b/);
    expect(el.style.getPropertyValue("--fancy-grid-cols")).toBe("3");

    unmount();
  });

  it("goes single-column on small screens by default", () => {
    // The thing every hand-rolled copy got slightly differently. Expressed as a
    // custom property so a design can override the breakpoint behaviour in CSS
    // without fighting a utility class.
    const { host, unmount } = mount(<Grid cols={4}>x</Grid>);

    expect(host.querySelector("[data-react-fancy-grid]")?.getAttribute("data-responsive")).toBe(
      "true",
    );

    unmount();
  });

  it("can be told not to collapse", () => {
    const { host, unmount } = mount(
      <Grid cols={2} responsive={false}>
        x
      </Grid>,
    );

    expect(host.querySelector("[data-react-fancy-grid]")?.getAttribute("data-responsive")).toBe(
      "false",
    );

    unmount();
  });
});

describe("all three", () => {
  it("forward className and data-* like every other component", () => {
    // The hole 5.8.0 closed across the inputs family. New components must not
    // reintroduce it.
    for (const [name, el] of [
      ["container", <Container className="mine" data-handle="c" key="c" />],
      ["section", <Section className="mine" data-handle="c" key="s" />],
      ["grid", <Grid className="mine" data-handle="c" key="g" />],
    ] as const) {
      const { host, unmount } = mount(el);
      const node = host.querySelector(`[data-react-fancy-${name}]`) as HTMLElement;

      expect(node.className, name).toContain("mine");
      expect(node.getAttribute("data-handle"), name).toBe("c");

      unmount();
    }
  });
});

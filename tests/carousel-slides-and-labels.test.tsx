// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Carousel } from "../src/components/Carousel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * K4 + K5 from the lab's full-kit benchmark (2026-11-10).
 *
 * K4: only the active slide was rendered, so two of three selling points were
 * missing from the server-rendered HTML. A directional carousel now renders
 * every slide; the inactive ones are `hidden` + `inert` (WAI-ARIA APG carousel:
 * slides are groups with `aria-roledescription="slide"`, only the current one
 * exposed). A wizard keeps rendering only its current step unless asked.
 *
 * K5: the default controls were the glyphs "←" / "→" with no accessible name.
 */

const roots: Array<() => void> = [];
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  roots.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}
afterEach(() => {
  while (roots.length) roots.pop()!();
});

const carousel = (extra: Record<string, unknown> = {}, controls: Record<string, unknown> = {}) => (
  <Carousel {...extra}>
    <Carousel.Panels>
      <Carousel.Slide>Fast setup</Carousel.Slide>
      <Carousel.Slide>Offline sync</Carousel.Slide>
      <Carousel.Slide>Team sharing</Carousel.Slide>
    </Carousel.Panels>
    <Carousel.Controls {...controls} />
  </Carousel>
);

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const slidesOf = (root: ParentNode) => [...root.querySelectorAll("[data-react-fancy-carousel-slide]")];

describe("Carousel: every slide on the first byte (K4)", () => {
  it("server-renders all three slides, only the active one visible", () => {
    const doc = parse(renderToString(carousel()));
    const slides = slidesOf(doc);
    expect(slides.map((s) => s.textContent)).toEqual(["Fast setup", "Offline sync", "Team sharing"]);
    expect(slides.map((s) => s.closest("[hidden]") !== null)).toEqual([false, true, true]);
    for (const s of slides.slice(1)) expect(s.closest("[inert]")).not.toBeNull();
  });

  it("marks each slide up as an APG slide group", () => {
    const doc = parse(renderToString(carousel()));
    const groups = [...doc.querySelectorAll('[aria-roledescription="slide"]')];
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.getAttribute("role"))).toEqual(["group", "group", "group"]);
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
  });

  it("moving to the next slide swaps visibility without remounting", () => {
    const host = mount(carousel());
    const before = slidesOf(host);
    act(() => {
      host.querySelectorAll<HTMLButtonElement>("[data-react-fancy-carousel-controls] button")[1].click();
    });
    const after = slidesOf(host);
    expect(after[1]).toBe(before[1]);
    expect(after.map((s) => s.closest("[hidden]") !== null)).toEqual([true, false, true]);
  });

  it("keepMounted={false} restores active-only rendering", () => {
    const html = renderToString(carousel({ keepMounted: false }));
    expect(html).toContain("Fast setup");
    expect(html).not.toContain("Offline sync");
  });

  it("a wizard still renders only its current step by default", () => {
    const html = renderToString(carousel({ variant: "wizard" }));
    expect(html).toContain("Fast setup");
    expect(html).not.toContain("Offline sync");
  });
});

describe("Carousel controls have accessible names (K5)", () => {
  const buttons = (host: HTMLElement) =>
    [...host.querySelectorAll<HTMLButtonElement>("[data-react-fancy-carousel-controls] button")];

  it("defaults to Previous slide / Next slide", () => {
    const host = mount(carousel());
    expect(buttons(host).map((b) => b.getAttribute("aria-label"))).toEqual(["Previous slide", "Next slide"]);
  });

  it("names and slide labels are overridable through labels", () => {
    const host = mount(
      carousel({ labels: { previous: "Diapositiva anterior", next: "Siguiente diapositiva", slide: "diapositiva", slideOf: "{index} de {total}" } }),
    );
    expect(buttons(host).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Diapositiva anterior",
      "Siguiente diapositiva",
    ]);
    const first = host.querySelector('[aria-roledescription="diapositiva"]');
    expect(first?.getAttribute("aria-label")).toBe("1 de 3");
  });

  it("a visible text label names the button itself (no conflicting aria-label)", () => {
    const host = mount(carousel({}, { prevLabel: "Back", nextLabel: "Forward" }));
    expect(buttons(host).map((b) => b.getAttribute("aria-label"))).toEqual([null, null]);
    expect(buttons(host).map((b) => b.textContent)).toEqual(["Back", "Forward"]);
  });
});

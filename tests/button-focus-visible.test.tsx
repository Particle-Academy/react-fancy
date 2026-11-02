// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Button } from "../src/components/Button";
import { Callout } from "../src/components/Callout";

/**
 * 6.1.0 — the focus ring follows `:focus-visible`, not `:focus`.
 *
 * Button used `focus:ring-2` with no ring colour. `:focus` matches a
 * MOUSE-clicked button too, so a clicked Button kept a ring until focus moved
 * elsewhere, and with no colour set the ring fell back to `currentColor`: a
 * highlighted row showed a thick near-black outline after every click.
 * `:focus-visible` is the browser's "the user is navigating by keyboard"
 * heuristic, which is what the ring is for.
 *
 * Callout's dismiss button had the identical `focus:ring-2` and the identical
 * click-leaves-a-ring defect, so it gets the identical fix.
 */

function classesOf(node: ReactElement, selector: string): string[] {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(node);
  const el = host.querySelector(selector) as HTMLElement | null;
  if (!el) throw new Error(`no element matches ${selector}`);
  return el.className.split(/\s+/);
}

describe("Button focus ring", () => {
  const cls = () => classesOf(<Button>Act</Button>, "[data-react-fancy-button]");

  it("rings on :focus-visible", () => {
    expect(cls()).toContain("focus-visible:ring-2");
  });

  it("does not ring on bare :focus, which a mouse click also triggers", () => {
    expect(cls().filter((c) => c.startsWith("focus:ring"))).toEqual([]);
  });

  it("gives the ring a colour in light and dark mode instead of currentColor", () => {
    const c = cls();
    expect(c).toContain("focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))]");
    expect(c).toContain("dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]");
  });

  it("offsets the ring against the surface, so dark mode does not get a white gap", () => {
    const c = cls();
    expect(c).toContain("focus-visible:ring-offset-[color:var(--fancy-surface,var(--color-white))]");
    expect(c).toContain("dark:focus-visible:ring-offset-[color:var(--fancy-surface-dark,var(--color-zinc-900))]");
  });

  it("still suppresses the UA outline", () => {
    expect(cls()).toContain("focus:outline-none");
  });

  it("anchor-mode Buttons get the same ring", () => {
    const c = classesOf(<Button href="/x">Go</Button>, "[data-react-fancy-button]");
    expect(c).toContain("focus-visible:ring-2");
    expect(c.filter((x) => x.startsWith("focus:ring"))).toEqual([]);
  });
});

describe("Callout dismiss button focus ring", () => {
  const cls = () =>
    classesOf(
      <Callout dismissible onDismiss={() => {}}>Saved</Callout>,
      "button",
    );

  it("rings on :focus-visible, not bare :focus", () => {
    const c = cls();
    expect(c).toContain("focus-visible:ring-2");
    expect(c.filter((x) => x.startsWith("focus:ring"))).toEqual([]);
  });
});

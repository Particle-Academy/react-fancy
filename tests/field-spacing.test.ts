import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

/** Strip comments before matching — this file's own docs quote CSS. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * `Field` must not bake vertical rhythm into itself.
 *
 * The shipped stylesheet carried:
 *
 *   [data-react-fancy-field] + [data-react-fancy-field] { margin-top: 1rem; }
 *
 * An adjacent-sibling selector has no idea which way the parent lays its
 * children out. Stacked vertically that reads as spacing; in a `grid-cols-2`
 * row it pushes the right-hand cell 16px down, and `items-start` cannot rescue
 * it because a margin is not alignment. Measured in a real browser against the
 * shipped CSS: field 1 at y=2034, field 2 at y=2050, `margin-top: 16px`.
 *
 * Reported by a consuming app, whose workaround was wrapping every `Field` in a
 * plain `<div>` so each became an only-child. Needing a wrapper per field to
 * use a component in a grid is the smell, and they were right about the cause.
 *
 * **Spacing belongs to the container.** That is what `gap` and `space-y-*` are
 * for, and a container knows its own axis where a sibling selector never can.
 *
 * These are structural assertions on the source, following
 * `styles-layering.test.ts`: jsdom does not apply stylesheets, so a
 * computed-margin test would pass no matter what this file contained.
 */
describe("Field owns no vertical rhythm", () => {
  it("ships no adjacent-sibling margin between fields", () => {
    // The exact rule, and any respelling of it — `~` instead of `+`, or
    // `:not(:first-child)`, all reintroduce the same layout-blind behaviour.
    expect(code).not.toMatch(
      /\[data-react-fancy-field\]\s*[+~]\s*\[data-react-fancy-field\]/,
    );
    expect(code).not.toMatch(/\[data-react-fancy-field\][^{}]*:not\(\s*:first-child\s*\)/);
    expect(code).not.toMatch(/\[data-react-fancy-field\][^{}]*:first-child\s*\)?\s*~/);
  });

  it("sets no margin on the field element from any selector", () => {
    // Broader guard: catches someone moving the margin onto the element itself
    // rather than the sibling pair, which fixes the grid case by accident and
    // breaks the first field's spacing instead.
    const fieldBlocks = [...code.matchAll(/([^{}]*\[data-react-fancy-field\][^{}]*)\{([^}]*)\}/g)];

    for (const [, selector, body] of fieldBlocks) {
      expect(body, `margin declared in: ${selector!.trim()}`).not.toMatch(/(^|[\s;])margin(-top|-block-start)?\s*:/);
    }
  });

  it("still ships the rest of the input defaults", () => {
    // The over-deletion guard. Removing the spacing rule must not take the
    // transitions and dark-mode defaults with it — without this, an empty
    // stylesheet would pass every assertion above.
    expect(code).toMatch(/\[data-react-fancy-input\]/);
    expect(code).toMatch(/transition/);
    expect(code.length).toBeGreaterThan(2000);
  });
});

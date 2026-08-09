import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

/**
 * Shipped styles must be LAYERED — issue #20.
 *
 * In the CSS cascade, an unlayered normal declaration beats every layered one,
 * whatever the specificity. Tailwind v4 puts utilities in `@layer utilities`, so
 * shipping base looks unlayered meant a utility passed through `className` could
 * never win:
 *
 *   <Badge className="bg-[#4338CA] text-white" />   // present in the DOM, outranked
 *
 * It fails silently and backwards. The class is in the DOM, DevTools shows it,
 * nothing warns — and the consumer doing the documented thing gets a worse
 * result than one reaching for `!important`. #20 shipped a five-step colour ramp
 * that rendered as five identical pills.
 *
 * Note the existing `:where()` wrappers do NOT save this. They drop specificity
 * to zero, which is the right instinct, but specificity is only compared WITHIN
 * a layer — unlayered still wins. That is exactly why this needed a structural
 * fix rather than more `:where()`.
 *
 * These are structural assertions on the source because jsdom does not implement
 * cascade layers, so a rendered-style test would pass regardless and prove
 * nothing.
 */

/**
 * Top-level blocks, split on brace depth.
 *
 * Comments are stripped FIRST. This file's doc comments contain braces (they
 * quote CSS), and counting those threw the depth off so that no block ever
 * closed at zero — which showed up as the @theme assertion failing against a
 * file that plainly has a top-level @theme.
 */
function topLevelBlocks(source: string): string[] {
  const src = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        // Strip leading comments/blank lines, or every block would "start with"
        // the doc comment above it and none of the classifications below would
        // match. (This bit me first time round — the @theme assertion failed
        // against a file that does have a top-level @theme.)
        out.push(
          src
            .slice(start, i + 1)
            .replace(/^\s*(?:\/\*[\s\S]*?\*\/\s*)*/, "")
            .trim(),
        );
        start = i + 1;
      }
    }
  }
  return out.filter(Boolean);
}

describe("shipped CSS is layered", () => {
  const blocks = topLevelBlocks(css);

  it("declares the base layer", () => {
    expect(css).toContain("@layer base");
  });

  it("puts every component rule inside a layer", () => {
    // The rules that actually style components. If any sits at the top level it
    // outranks every Tailwind utility a consumer writes.
    const unlayered = blocks.filter(
      (b) =>
        b.includes("[data-react-fancy-") &&
        !b.startsWith("@layer") &&
        !b.startsWith("@theme"),
    );

    expect(unlayered.map((b) => b.slice(0, 60))).toEqual([]);
  });

  it("puts the .fancy-* helper classes inside a layer too", () => {
    const unlayered = blocks.filter(
      (b) => /^\.fancy-[a-z-]+\s*[,{]/.test(b) && !b.startsWith("@layer"),
    );

    expect(unlayered.map((b) => b.slice(0, 60))).toEqual([]);
  });

  it("leaves @theme at the top level", () => {
    // Tailwind v4 processes `@theme` as a directive, not as ordinary rules.
    // Wrapping it in a layer stops it registering tokens at all — which would
    // turn `bg-brand` and `text-primary-600` back into classes that resolve to
    // nothing, the exact failure the token block was written to prevent.
    const themeBlocks = blocks.filter((b) => b.startsWith("@theme"));

    expect(themeBlocks.length).toBeGreaterThan(0);
  });

  it("leaves @keyframes at the top level", () => {
    // Keyframes are not subject to the cascade, so layering them buys nothing
    // and only risks a name-resolution surprise.
    const layered = blocks.filter((b) => b.startsWith("@layer") && b.includes("@keyframes"));

    expect(layered.map((b) => b.slice(0, 40))).toEqual([]);
  });

  it("uses `base` rather than a private layer name", () => {
    // A private layer (`@layer fancy-base`) would order by FIRST DECLARATION,
    // so whether utilities won would depend on whether the consumer imported
    // this file before or after Tailwind. Joining Tailwind's own `base` is
    // order-independent: `base` always precedes `components` and `utilities`.
    expect(css).not.toContain("@layer fancy-base");
  });
});

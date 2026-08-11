import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const modal = readFileSync(new URL("../src/components/Modal/Modal.tsx", import.meta.url), "utf8");
const body = readFileSync(new URL("../src/components/Modal/ModalBody.tsx", import.meta.url), "utf8");

/** Strip comments before matching — this file's own docs quote class names. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * A Modal must never grow taller than the viewport.
 *
 * `ModalBody` has carried `flex-1 overflow-y-auto` all along, and the panel is
 * `flex flex-col overflow-hidden`. All the scrolling machinery was there. What
 * was missing is the one thing that makes it engage: **a max-height on the
 * panel**. Only `size="full"` had one. Every other size — including the `md`
 * default — was width-constrained and vertically unbounded, so a long modal
 * grew past the bottom of the screen and its content became unreachable. The
 * `overflow-y-auto` never fired, because there was no overflow: the box simply
 * got taller.
 *
 * Reported from a real app after hitting it repeatedly.
 *
 * These are structural assertions on the source, following
 * `styles-layering.test.ts`: jsdom performs no layout, so a rendered
 * height test would pass no matter what these files contained.
 */
describe("Modal is bounded by the viewport", () => {
  const sizes = ["sm", "md", "lg", "xl", "full"];

  /** The SIZE_MAP entry for one size — quoted or template-literal. */
  function sizeEntry(size: string): string | null {
    const m = new RegExp(`\\b${size}:\\s*([\`"'])([\\s\\S]*?)\\1`).exec(code(modal));
    return m ? m[2]! : null;
  }

  it.each(sizes)("size %s constrains its height", (size) => {
    // Asserted per size rather than over the whole map, so adding a sixth size
    // without a height cap fails on that size by name.
    const entry = sizeEntry(size);
    expect(entry, `no SIZE_MAP entry for ${size}`).not.toBeNull();

    // The cap may be inline or come from a shared constant — either is fine, as
    // long as this size ends up with one. Resolving the constant rather than
    // demanding a literal keeps the test from dictating how the code is
    // factored.
    const resolved = entry!.includes("VIEWPORT_CAP")
      ? entry! + " " + (/VIEWPORT_CAP\s*=\s*"([^"]*)"/.exec(code(modal))?.[1] ?? "")
      : entry!;

    expect(resolved, `size "${size}" has no max-height — it can grow past the viewport`).toMatch(
      /max-h-\[/,
    );
  });

  it("caps against the viewport, not a fixed pixel height", () => {
    // A px cap would be wrong on a short window and wasteful on a tall one.
    const caps = [...code(modal).matchAll(/max-h-\[([^\]]+)\]/g)].map((m) => m[1]!);

    expect(caps.length).toBeGreaterThan(0);
    for (const cap of caps) {
      expect(cap, `max-h-[${cap}] is not viewport-relative`).toMatch(/vh|dvh|svh/);
    }
  });

  it("lets the body scroll inside that cap", () => {
    // The cap alone is not enough: the panel must clip, and the body must be
    // the part that scrolls.
    expect(code(modal)).toContain("overflow-hidden");
    expect(code(body)).toContain("overflow-y-auto");
  });

  it("lets the body SHRINK, which flexbox does not do by default", () => {
    // The subtle half. A flex child defaults to `min-height: auto`, so `flex-1`
    // alone refuses to shrink below its content — the panel would blow through
    // its own max-height and the scrollbar would never appear. `min-h-0` is
    // what actually permits the overflow that `overflow-y-auto` then handles.
    expect(code(body)).toMatch(/min-h-0/);
  });
});

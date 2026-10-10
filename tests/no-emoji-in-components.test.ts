import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/**
 * The one file where an emoji is the SUBJECT, not the iconography: the picker's
 * dataset. Listed by exact path rather than a pattern, so a new file cannot
 * join the exemption by being named something emoji-ish.
 */
const ALLOWED = new Set(["data/emoji-data.ts"]);

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

/**
 * No emoji in a component — a positive control this suite could not otherwise
 * provide.
 *
 * `PromptInput` shipped a literal paperclip emoji as the attach control's icon.
 * An emoji needs a COLOUR EMOJI FONT installed, not merely a font with broad
 * coverage, so in a lean Linux container it rendered as a tofu box where the
 * affordance should have been. Every test here passed, and would have passed
 * forever: jsdom has no fonts, so an emoji asserted in a DOM string is
 * indistinguishable from one a user can see. It took a consumer screenshotting
 * a real Electron window to find it — the component's own suite was structurally
 * unable to.
 *
 * So this does not test rendering. It tests the SOURCE for the property that
 * actually predicts the failure: a character outside the Basic Multilingual
 * Plane. That line is not a stylistic preference — it is where "needs a font
 * with good coverage" becomes "needs a second font dedicated to emoji", which
 * a container image has no reason to carry.
 *
 * BMP symbols (`×`, `·`, `→`, `⌘`) are deliberately NOT covered. They are a
 * real but far smaller risk, they are judgement calls one at a time, and a rule
 * that flagged them would be argued with and then deleted. This one has no
 * false positives in the whole tree.
 */
describe("components contain no emoji", () => {
  const files = sources(SRC);

  it("found the source tree", () => {
    // Without this, a bad path makes the sweep below pass by sweeping nothing —
    // the precise failure this file exists to catch.
    expect(files.length).toBeGreaterThan(200);
  });

  it("has no character above the BMP outside the emoji dataset", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      if (ALLOWED.has(rel)) continue;

      const text = readFileSync(file, "utf8");
      const found = new Set<string>();
      for (const ch of text) {
        const cp = ch.codePointAt(0)!;
        if (cp > 0xffff) found.add(`U+${cp.toString(16).toUpperCase()}`);
      }
      if (found.size > 0) offenders.push(`${rel}: ${[...found].join(", ")}`);
    }

    // Named, so the failure says which file and which code point rather than
    // "expected 1 to be 0".
    expect(offenders).toEqual([]);
  });

  it("still sees the emoji dataset, so the exemption is doing work", () => {
    // A guard on the guard: if the dataset were moved or renamed, ALLOWED would
    // quietly cover nothing and nobody would learn that from a green run.
    const dataset = readFileSync(join(SRC, "data", "emoji-data.ts"), "utf8");
    const astral = [...dataset].filter((ch) => ch.codePointAt(0)! > 0xffff);

    expect(astral.length).toBeGreaterThan(100);
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { compile } from "tailwindcss";

/**
 * `[data-theme="dark"]` must move every surface `.dark` moves (5.53.0).
 *
 * TribeShare bound `@custom-variant dark` to the attribute in their own CSS and
 * the distributed CSS did not follow. That is not something a variant CAN fix:
 * `@custom-variant` rewrites what Tailwind compiles through the `dark` variant
 * (`dark:` utilities, `@variant dark` blocks). `styles.css` wrote `.dark` into
 * plain selectors -- the secondary-scale flip, the inherent dark inputs and
 * overlays, the checkerboard -- and a variant never touches a literal selector.
 *
 * So two halves, pinned separately:
 *  1. styles.css names the attribute next to the class, everywhere.
 *  2. The package ships the variant line (`dark-variant.css`) that makes the
 *     components' compiled `dark:` utilities follow the attribute too, because
 *     that variant is defined in the CONSUMER's CSS and react-fancy cannot
 *     change it from inside its own.
 */

const ROOT = path.resolve(__dirname, "..");
const css = readFileSync(path.join(ROOT, "src/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Selector lists of every rule whose selector mentions .dark. */
function darkSelectorLists(): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/([^{};]+)\{/g)) {
    const sel = m[1].trim();
    if (/\.dark\b/.test(sel)) out.push(sel);
  }
  return out;
}

describe("styles.css follows the attribute wherever it follows the class", () => {
  it("has dark rules to check", () => {
    expect(darkSelectorLists().length).toBeGreaterThan(8);
  });

  it('every ".dark …" selector has a [data-theme="dark"] twin in the same rule', () => {
    const missing: string[] = [];
    for (const sel of darkSelectorLists()) {
      for (const m of sel.matchAll(/\.dark\b([^,(){]*)/g)) {
        const twin = `[data-theme="dark"]${m[1]}`;
        if (!sel.includes(twin)) missing.push(`${sel}  -- missing ${twin}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("the selectors actually MATCH under the attribute alone (real selector engine)", () => {
    document.body.innerHTML = `
      <div data-theme="dark">
        <div data-react-fancy-modal id="overlay"></div>
        <div data-react-fancy-input id="field"><input id="field-input" /></div>
        <div class="fancy-checkerboard" id="board"></div>
      </div>
      <div data-theme="light">
        <div data-react-fancy-modal id="light-overlay"></div>
      </div>`;
    const lists = darkSelectorLists();
    const matchesAny = (id: string) =>
      lists.some((sel) => {
        try {
          return document.getElementById(id)!.matches(sel);
        } catch {
          return false;
        }
      });

    // The scale flip on the attribute element itself.
    expect(lists.some((sel) => document.querySelector('[data-theme="dark"]')!.matches(sel))).toBe(true);
    expect(matchesAny("overlay")).toBe(true);
    expect(matchesAny("field-input")).toBe(true);
    expect(matchesAny("board")).toBe(true);
    // And never under the light attribute -- the twin must not over-match.
    expect(matchesAny("light-overlay")).toBe(false);
  });

  it(".dark keeps matching exactly as before", () => {
    document.body.innerHTML = `<div class="dark"><div data-react-fancy-modal id="o"></div></div>`;
    expect(darkSelectorLists().some((sel) => document.getElementById("o")!.matches(sel))).toBe(true);
  });
});

/* ── the shipped variant line ────────────────────────────────────────────── */

const require = createRequire(import.meta.url);

async function compileWith(entry: string, candidates: string[]): Promise<string> {
  const { build } = await compile(entry, {
    base: ROOT,
    loadStylesheet: async (id: string, base: string) => {
      const resolved = id.startsWith("tailwindcss")
        ? require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id)
        : path.resolve(base, id);
      return { path: resolved, base: path.dirname(resolved), content: await readFile(resolved, "utf8") };
    },
  });
  return build(candidates);
}

describe("dark-variant.css", () => {
  const file = path.join(ROOT, "src/dark-variant.css");

  it("exists and is exported as a subpath", () => {
    expect(existsSync(file)).toBe(true);
    const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.exports["./dark-variant.css"]).toBe("./dist/dark-variant.css");
  });

  it("makes a compiled dark: utility follow .dark AND [data-theme=dark]", async () => {
    const out = await compileWith(
      ['@import "tailwindcss/theme.css";', '@import "./src/dark-variant.css";', '@import "tailwindcss/utilities.css";'].join("\n"),
      ["dark:bg-red-500"],
    );
    const rule = out.slice(out.indexOf(".dark\\:bg-red-500"));
    expect(rule).toMatch(/\.dark\b/);
    expect(rule).toContain('[data-theme="dark"]');
    // Descendants as well as the element itself, for both hooks.
    expect(rule).toContain('[data-theme="dark"] *');
    expect(rule).toContain(".dark *");
  });

  it("without it, Tailwind's default dark: follows neither (the control)", async () => {
    const out = await compileWith(
      ['@import "tailwindcss/theme.css";', '@import "tailwindcss/utilities.css";'].join("\n"),
      ["dark:bg-red-500"],
    );
    expect(out).toContain("prefers-color-scheme: dark");
    expect(out).not.toContain("data-theme");
  });
});

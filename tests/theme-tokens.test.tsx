import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { compile } from "tailwindcss";
import { THEME_TOKENS } from "../src/theme-tokens";

/**
 * Semantic theme tokens (5.52.0) — the contract a host maps its palette onto.
 *
 * Every converted component reads `--fancy-<role>` (light) and
 * `--fancy-<role>-dark` (dark) through a Tailwind arbitrary value whose var()
 * FALLBACK is the colour the component used before:
 *
 *   bg-white dark:bg-zinc-900
 *   bg-[color:var(--fancy-surface,var(--color-white))]
 *     dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]
 *
 * So an app that sets nothing renders the identical declaration value, and an
 * app that sets `--fancy-surface` moves every surface without touching zinc.
 *
 * What this file pins, and why each matters:
 *  - every token class in the source is one Tailwind actually generates
 *    (a class nothing emits is a component with no colour at all);
 *  - every fallback IS the documented default in THEME_TOKENS, so the table
 *    the docs render cannot drift from what the components do;
 *  - the fallback reproduces the old utility's declaration byte for byte;
 *  - the palette variable the fallback names is emitted by the consumer's
 *    build, or the fallback resolves to nothing.
 */

const require = createRequire(import.meta.url);

const ENTRY = [
  "@layer theme, base, components, utilities;",
  '@import "tailwindcss/theme.css" layer(theme);',
  '@import "tailwindcss/utilities.css" layer(utilities);',
].join("\n");

async function compileFor(candidates: string[]): Promise<string> {
  const { build } = await compile(ENTRY, {
    base: process.cwd(),
    loadStylesheet: async (id: string, base: string) => {
      const resolved = id.startsWith("tailwindcss")
        ? require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id)
        : path.resolve(base, id);
      return { path: resolved, base: path.dirname(resolved), content: await readFile(resolved, "utf8") };
    },
  });
  return build(candidates);
}

function toSelector(className: string): string {
  return `.${className.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)}`;
}

/** The declaration value of the rule generated for one class. */
function declarationOf(css: string, className: string): string | undefined {
  const head = toSelector(className) + " {";
  const at = css.indexOf(head);
  if (at < 0) return undefined;
  // Slice from AFTER the brace: an escaped selector contains colons of its own.
  const body = css.slice(at + head.length, css.indexOf("}", at));
  const m = body.match(/:\s*([^;]+);/);
  return m?.[1].trim();
}

const SRC = path.resolve(__dirname, "../src/components");

function sourceFiles(): string[] {
  const out: string[] = [];
  (function walk(d: string) {
    for (const n of readdirSync(d)) {
      const p = path.join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(n)) out.push(p);
    }
  })(SRC);
  return out;
}

const TOKEN_CLASS =
  /[\w:[\]&>*@.-]*?(?:bg|text|border|ring|fill|stroke)-\[color:var\(--fancy-[a-z-]+,[^\]\s]+\)\](?:\/\d+)?/g;

function tokenClassesInSource(): string[] {
  const found = new Set<string>();
  for (const f of sourceFiles()) {
    for (const m of readFileSync(f, "utf8").matchAll(TOKEN_CLASS)) found.add(m[0]);
  }
  return [...found].sort();
}

/**
 * Elements that painted ONE colour in both modes before tokens existed. They
 * read the light token in light and the dark token in dark — so a host's
 * palette reaches them — but their fallbacks keep today's single colour,
 * because "set nothing, see no change" outranks tidiness. Listed by exact class
 * so a new one has to be argued for here.
 */
const SAME_IN_BOTH_MODES = new Set([
  // ChartLine dot hole + ChartPie slice gap: white in both modes.
  "fill-[color:var(--fancy-surface,var(--color-white))]",
  "dark:fill-[color:var(--fancy-surface-dark,var(--color-white))]",
  "stroke-[color:var(--fancy-surface,var(--color-white))]",
  "dark:stroke-[color:var(--fancy-surface-dark,var(--color-white))]",
  // MoodMeter grid lines: #a1a1aa (Tailwind v3's zinc-400) in both modes.
  "stroke-[color:var(--fancy-text-faint,#a1a1aa)]",
  "dark:stroke-[color:var(--fancy-text-faint-dark,#a1a1aa)]",
]);

describe("THEME_TOKENS — the table", () => {
  it("is small, and names a light and a dark default for every role", () => {
    const roles = Object.keys(THEME_TOKENS);
    expect(roles.length).toBeGreaterThanOrEqual(8);
    expect(roles.length).toBeLessThanOrEqual(12);
    for (const role of roles) {
      const t = THEME_TOKENS[role as keyof typeof THEME_TOKENS];
      expect(t.light, role).toBeTruthy();
      expect(t.dark, role).toBeTruthy();
      expect(t.variable).toBe(`--fancy-${role}`);
      expect(t.darkVariable).toBe(`--fancy-${role}-dark`);
      expect(t.description.length, role).toBeGreaterThan(10);
    }
  });
});

describe("token classes in the components", () => {
  it("exist — a real share of the kit reads tokens, not zinc", () => {
    // Guard on the guard: an empty harvest would make every check below pass.
    expect(tokenClassesInSource().length).toBeGreaterThan(40);
  });

  it("every one names a known token, with the documented default as its fallback", () => {
    const wrong: string[] = [];
    for (const cls of tokenClassesInSource()) {
      const m = cls.match(/var\((--fancy-([a-z-]+?)(-dark)?),([^\]]+)\)\]/)!;
      const role = m[2] as keyof typeof THEME_TOKENS;
      const t = THEME_TOKENS[role];
      if (!t) {
        wrong.push(`${cls}: unknown token ${m[1]}`);
        continue;
      }
      const expected = m[3] ? t.dark : t.light;
      if (SAME_IN_BOTH_MODES.has(cls)) continue;
      if (m[4] !== expected) wrong.push(`${cls}: fallback ${m[4]} but THEME_TOKENS says ${expected}`);
    }
    expect(wrong).toEqual([]);
  });

  it("every one is a class Tailwind generates", async () => {
    const classes = tokenClassesInSource();
    const css = await compileFor(classes);
    const missing = classes.filter((c) => !css.includes(toSelector(c)));
    expect(missing).toEqual([]);
  });

  it("emits the palette variable each fallback names, so an unset token still resolves", async () => {
    const classes = tokenClassesInSource();
    const css = await compileFor(classes);
    const named = new Set<string>();
    for (const c of classes) for (const m of c.matchAll(/var\((--color-[a-z0-9-]+)\)/g)) named.add(m[1]);
    expect(named.size).toBeGreaterThan(3);
    const notEmitted = [...named].filter((v) => !css.includes(`${v}:`));
    expect(notEmitted).toEqual([]);
  });
});

describe("defaults reproduce today's look exactly", () => {
  it("each token's fallback is the declaration the old utility produced", async () => {
    const pairs: Array<[old: string, token: string]> = [];
    for (const [role, t] of Object.entries(THEME_TOKENS)) {
      for (const [value, variable] of [
        [t.light, t.variable],
        [t.dark, t.darkVariable],
      ] as const) {
        const palette = value.match(/^var\(--color-(.+)\)$/);
        const old = palette ? `bg-${palette[1]}` : `bg-[${value}]`;
        pairs.push([old, `bg-[color:var(${variable},${value})]`]);
        expect(role).toBeTruthy();
      }
    }
    const css = await compileFor(pairs.flat());
    for (const [old, token] of pairs) {
      const before = declarationOf(css, old);
      const after = declarationOf(css, token);
      expect(before, old).toBeTruthy();
      // var(--fancy-x, V) with --fancy-x unset IS V — the same computed value.
      expect(after, token).toBe(`var(${token.match(/var\((--fancy-[a-z-]+)/)![1]},${before})`);
    }
  });
});

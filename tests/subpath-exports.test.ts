import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  exports: Record<string, unknown>;
};

/** The same scan the build uses, so the two cannot drift apart silently. */
function componentSlugs(): string[] {
  const out = new Set<string>();

  for (const dir of ["src/components", "src/components/inputs"]) {
    const full = resolve(process.cwd(), dir);
    if (!existsSync(full)) continue;

    for (const e of readdirSync(full, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      if (!existsSync(resolve(full, e.name, "index.ts"))) continue;

      out.add(
        e.name
          .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
          .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
          .toLowerCase(),
      );
    }
  }

  return [...out];
}

/**
 * Per-component subpaths — issue #21.
 *
 * `dist/index.js` was ~660 kB exporting ~140 names, and importing a single
 * `Badge` pulled all of it: a consumer's smallest route shipped ~931 kB of kit
 * to render a form with four inputs. Tree-shaking could not rescue it — the
 * bundle had hundreds of top-level initialiser calls, which a bundler must keep
 * and which transitively retain most of the graph.
 *
 * Measured before and after, bundling a consumer that imports only `Badge`:
 *
 *   published 5.12.0   1,133,438 bytes minified
 *   after              33,255 bytes minified
 *
 * These assertions cover the part that rots: the exports map is generated from
 * the component tree, and a new component that never reaches `package.json`
 * would simply be unimportable by subpath with nothing to say so.
 */
describe("subpath exports", () => {
  const slugs = componentSlugs();

  it("found the component tree", () => {
    // Without this, a broken scan would make every assertion below vacuous.
    expect(slugs.length).toBeGreaterThan(50);
  });

  it("declares a subpath for every component", () => {
    const missing = slugs.filter((s) => !(`./${s}` in pkg.exports));

    expect(missing).toEqual([]);
  });

  it("keeps the barrel and the existing entries", () => {
    // `.` staying the barrel is what makes this non-breaking: every existing
    // import keeps working untouched.
    expect(pkg.exports["."]).toBeDefined();
    expect(pkg.exports["./icons"]).toBeDefined();
    expect(pkg.exports["./styles.css"]).toBeDefined();
  });

  it("points every subpath at both ESM and CJS with types", () => {
    for (const s of slugs) {
      const entry = pkg.exports[`./${s}`] as Record<string, Record<string, string>>;

      expect(entry.import?.default, `${s} esm`).toBe(`./dist/${s}.js`);
      expect(entry.import?.types, `${s} types`).toBe(`./dist/${s}.d.ts`);
      expect(entry.require?.default, `${s} cjs`).toBe(`./dist/${s}.cjs`);
    }
  });

  it("declares no subpath that has no component behind it", () => {
    // The other direction: a renamed or deleted component must not leave a
    // subpath pointing at a file the build no longer emits.
    const known = new Set(["." , "./icons", "./styles.css"]);
    const declared = Object.keys(pkg.exports).filter((k) => !known.has(k));
    const orphans = declared.filter((k) => !slugs.includes(k.slice(2)));

    expect(orphans).toEqual([]);
  });
});

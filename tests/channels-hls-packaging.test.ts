import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * hls.js is an OPTIONAL adapter, never a react-fancy dependency (owner
 * approval q_8d88f092, 2026-11-14). An app that never imports
 * `./channels/hls` must not install, resolve or ship hls.js.
 *
 * Three layers, because each catches what the others miss:
 *  1. the manifest: optional peer + devDependency only;
 *  2. the source graph: nothing reachable from the barrel or any component
 *     subpath imports hls.js (holds with no build);
 *  3. the build output, when present: no chunk but the adapter's mentions it,
 *     and the adapter keeps it external rather than bundling it.
 */

const ROOT = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as Record<string, any>;
const IMPORTS_HLS = /(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s+)["']hls\.js(?:\/[^"']*)?["']/;

describe("the manifest", () => {
  it("is not a dependency of any kind a consumer installs", () => {
    expect(pkg.dependencies?.["hls.js"]).toBeUndefined();
    expect(pkg.optionalDependencies?.["hls.js"]).toBeUndefined();
    expect(pkg.bundleDependencies ?? pkg.bundledDependencies ?? []).not.toContain("hls.js");
  });

  it("is an OPTIONAL peer, and a devDependency for the tests", () => {
    expect(pkg.peerDependencies?.["hls.js"]).toMatch(/1\.7\.4/);
    expect(pkg.peerDependenciesMeta?.["hls.js"]?.optional).toBe(true);
    expect(pkg.devDependencies?.["hls.js"]).toBeDefined();
  });

  it("exposes the adapter as its own subpath, marked as having side effects", () => {
    const entry = pkg.exports["./channels/hls"];
    expect(entry.import.default).toBe("./dist/channels/hls.js");
    expect(entry.require.default).toBe("./dist/channels/hls.cjs");
    expect(entry.import.types).toBe("./dist/channels/hls.d.ts");
    // It registers itself on import; a bundler must not drop `import ".../channels/hls"`.
    expect(pkg.sideEffects).toEqual(expect.arrayContaining(["./dist/channels/hls.js", "./dist/channels/hls.cjs"]));
  });

  it("tsup keeps it external", () => {
    const tsup = readFileSync(resolve(ROOT, "tsup.config.ts"), "utf8");
    expect(tsup).toMatch(/external:\s*\[[^\]]*"hls\.js"/);
    expect(tsup).toContain('"channels/hls": "src/channels/hls.ts"');
  });
});

/** Resolve a relative import to a source file. */
function resolveImport(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

function reachable(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) {
      const hit = resolveImport(file, m[1]!);
      if (hit) queue.push(hit);
    }
  }
  return seen;
}

describe("the source graph", () => {
  const componentIndexes = ["src/components", "src/components/inputs"].flatMap((d) =>
    readdirSync(resolve(ROOT, d), { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(resolve(ROOT, d, e.name, "index.ts")))
      .map((e) => resolve(ROOT, d, e.name, "index.ts")),
  );
  const graph = reachable([resolve(ROOT, "src/index.ts"), resolve(ROOT, "src/icons.ts"), ...componentIndexes]);

  it("walked the real graph", () => {
    expect(graph.size).toBeGreaterThan(300);
    expect([...graph].some((f) => f.endsWith(join("ChannelPlayer", "ChannelPlayer.tsx")))).toBe(true);
  });

  it("never reaches hls.js from the barrel or any component subpath", () => {
    const offenders = [...graph].filter((f) => IMPORTS_HLS.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
    expect([...graph].some((f) => f.endsWith(join("channels", "hls.ts")))).toBe(false);
  });

  it("the adapter is the one file that imports it", () => {
    const all: string[] = [];
    (function walk(d: string) {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(n)) all.push(p);
      }
    })(resolve(ROOT, "src"));
    const importers = all.filter((f) => IMPORTS_HLS.test(readFileSync(f, "utf8")));
    expect(importers.map((f) => f.slice(ROOT.length + 1).split("\\").join("/"))).toEqual(["src/channels/hls.ts"]);
  });
});

const built = existsSync(resolve(ROOT, "dist/index.js")) && existsSync(resolve(ROOT, "dist/channels/hls.js"));

/** Read lazily: a describe body runs even when runIf skips its tests, and CI tests before it builds. */
function builtCode(): string[] {
  const files = readdirSync(resolve(ROOT, "dist"), { recursive: true, withFileTypes: false } as never) as unknown as string[];
  return files.map((f) => String(f).split("\\").join("/")).filter((f) => /\.(c?js)$/.test(f));
}

describe.runIf(built)("the build output", () => {
  it("mentions hls.js nowhere but the adapter's own entry", () => {
    const offenders = builtCode().filter((f) => !f.startsWith("channels/") && IMPORTS_HLS.test(readFileSync(resolve(ROOT, "dist", f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("keeps hls.js external in the adapter rather than bundling it", () => {
    for (const f of ["channels/hls.js", "channels/hls.cjs"]) {
      const src = readFileSync(resolve(ROOT, "dist", f), "utf8");
      expect(src, f).toMatch(IMPORTS_HLS);
      // hls.js itself is ~500 kB; the adapter is a few hundred bytes plus a chunk import.
      expect(src.length, f).toBeLessThan(20_000);
    }
  });
});

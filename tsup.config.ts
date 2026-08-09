import { readdirSync, existsSync } from "node:fs";
import { defineConfig } from "tsup";

/**
 * One entry per component, plus the barrel — issue #21.
 *
 * `dist/index.js` is ~660 kB and exports ~140 names, and a consumer importing a
 * single `Badge` paid for all of it. Tree-shaking cannot rescue that from the
 * outside: the bundle has hundreds of top-level initialiser calls
 * (`var X = createSomething(...)` at module scope), which a bundler must keep
 * and which transitively retain most of the graph. So the barrel is effectively
 * unsplittable by the consumer, however aggressively they code-split their own
 * routes — the reporter's smallest route shipped ~931 kB of kit to render a form
 * with four inputs.
 *
 * `.` stays the barrel, so every existing import keeps working unchanged.
 */
function componentEntries(): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [dir, prefix] of [
    ["src/components", ""],
    ["src/components/inputs", ""],
  ] as const) {
    if (!existsSync(dir)) continue;

    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const index = `${dir}/${name.name}/index.ts`;
      if (!existsSync(index)) continue;

      // Subpath is the kebab-cased component name: `.../prompt-input`.
      const slug = name.name
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .toLowerCase();

      // First writer wins; `src/components` is walked before `inputs`, so a
      // top-level component keeps the plain slug if the names ever collide.
      out[prefix + slug] ??= index;
    }
  }

  return out;
}

export default defineConfig({
  entry: {
    index: "src/index.ts",
    icons: "src/icons.ts",
    styles: "src/styles.css",
    ...componentEntries(),
  },
  format: ["esm", "cjs"],
  dts: { entry: { index: "src/index.ts", icons: "src/icons.ts", ...componentEntries() } },
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
  // Shared code goes to chunks instead of being copied into every entry.
  // Without this, per-component entries would trade one big download for a lot
  // of duplicated ones — worse than the barrel for anyone importing several.
  splitting: true,
});

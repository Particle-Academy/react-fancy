// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * A git dependency (`npm install github:Particle-Academy/react-fancy#<sha>`) is
 * installed from source: `dist/` is gitignored, so without a `prepare` script the
 * consumer gets a package with no entry point. npm runs `prepare` for git
 * dependencies, with devDependencies installed, so this is what makes a pinned
 * commit installable before it is on the registry (impactium's `npm ci`, the
 * lab's candidate installer).
 */
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")) as {
  scripts: Record<string, string>;
  files: string[];
  main?: string;
  module?: string;
};

describe("installable from git", () => {
  it("builds dist in prepare", () => {
    expect(pkg.scripts.prepare).toBe("npm run build");
    expect(pkg.scripts.build).toMatch(/tsup/);
  });

  it("ships the dist that prepare builds, and points its entries into it", () => {
    expect(pkg.files).toContain("dist");
    for (const entry of [pkg.main, pkg.module].filter(Boolean)) expect(entry).toMatch(/^\.\/dist\//);
  });
});

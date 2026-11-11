import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * K18 (full-kit benchmark): the build ran out of memory in a fresh clone.
 *
 * With no `compilerOptions.types`, TypeScript auto-includes EVERY package in
 * every ancestor `node_modules/@types`. A clone built inside another project
 * (the lab clones candidates under its own tree) therefore pulled that
 * project's `@types/node` into the declaration build, and the tsup DTS worker
 * died with ERR_WORKER_OUT_OF_MEMORY at an 8 GB heap. The same commit built in
 * an isolated directory needs about 6 GB. Measured 2026-11-11.
 *
 * An explicit list makes the program depend only on this repo's own files.
 */
describe("tsconfig isolates the build from ancestor @types", () => {
  const tsconfig = JSON.parse(readFileSync(new URL("../tsconfig.json", import.meta.url), "utf8")) as {
    compilerOptions: { types?: unknown };
  };

  it("sets compilerOptions.types explicitly", () => {
    expect(Array.isArray(tsconfig.compilerOptions.types)).toBe(true);
  });

  it("does not auto-include Node's globals into a browser library", () => {
    expect(tsconfig.compilerOptions.types).not.toContain("node");
  });
});

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Secondary grey text goes through a `--fancy-text-*` token, never a bare
 * palette class.
 *
 * 6.11.1 fixed FileUpload, whose hint was bare `text-zinc-500`: an app that
 * mapped `--fancy-text-muted` themed every other component and left that one
 * grey (3.23:1 on a #0A2347 surface). The audit that followed found the same
 * defect on 83 lines in 44 files: readable text, placeholders, the glyphs of
 * icon-only controls, hover colours and decorative separators, all painted with
 * a bare `text-zinc-400/500/600` that no host token can reach. 6.12.0 swept
 * them onto the tokens (muted, subtle, soft, faint and their `-dark` twins).
 *
 * This is that audit, made permanent: any `text-zinc-400`, `-500` or `-600`,
 * with any variant prefix (`dark:`, `hover:`, `placeholder:`,
 * `empty:before:`, ...), fails unless it is the fallback inside a
 * `var(--fancy-..., ...)`, which a host can override by definition.
 *
 * Primary text (`zinc-700` and darker, `zinc-300` and lighter as a dark-mode
 * foreground) is outside this check: it was not part of the audit.
 */

const ROOT = path.resolve(__dirname, "../src/components");

/**
 * The only bare greys allowed: the opt-in `zinc` entry of a colour map.
 * `color="zinc"` asks for the zinc palette by name, exactly as `color="red"`
 * asks for red, so it must stay zinc whatever the host's text tokens say.
 * Keyed by file; `line` must match the whole allowed line.
 */
const NAMED_PALETTE: Array<{ file: string; line: RegExp; reason: string }> = [
  {
    file: "Button/Button.colors.ts",
    line: /^\s*zinc: "bg-transparent text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-950\/50",$/,
    reason: "ghost Button color=\"zinc\": a named palette entry beside slate, gray, neutral, stone",
  },
  {
    file: "Callout/Callout.colors.ts",
    line: /^\s*zinc: "text-zinc-500 dark:text-zinc-400",$/,
    reason: "Callout color=\"zinc\" icon colour: a named palette entry",
  },
  {
    file: "Progress/Progress.colors.ts",
    line: /^\s*zinc: "text-zinc-600 dark:text-zinc-400",$/,
    reason: "Progress color=\"zinc\" label colour: a named palette entry",
  },
];

const BARE = /(?:^|[\s"'`])((?:[a-z-]+:)*text-zinc-(?:400|500|600))(?=[\s"'`]|$)/g;

function componentFiles(): string[] {
  const out: string[] = [];
  (function walk(d: string) {
    for (const n of readdirSync(d)) {
      const p = path.join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) out.push(p);
    }
  })(ROOT);
  return out.map((p) => path.relative(ROOT, p).replace(/\\/g, "/"));
}

function offenders(): string[] {
  const out: string[] = [];
  for (const rel of componentFiles()) {
    const lines = readFileSync(path.join(ROOT, rel), "utf8").split(/\r?\n/);
    lines.forEach((raw, i) => {
      // A token's own fallback is a default the host can override.
      const line = raw.replace(/var\(--fancy-[a-z-]+,[^)\]]*\)?\)/g, "");
      const hits = [...line.matchAll(BARE)].map((m) => m[1]);
      if (!hits.length) return;
      if (NAMED_PALETTE.some((a) => a.file === rel && a.line.test(raw))) return;
      out.push(`${rel}:${i + 1} ${hits.join(" ")}`);
    });
  }
  return out;
}

describe("secondary grey text reads the --fancy-text-* tokens", () => {
  it("scans the component tree", () => {
    expect(componentFiles().length).toBeGreaterThan(200);
  });

  it("no bare text-zinc-400/500/600 outside a token fallback or a named palette", () => {
    expect(offenders()).toEqual([]);
  });

  it("every named-palette exemption still matches a line (a stale exemption is a hole)", () => {
    const stale = NAMED_PALETTE.filter((a) => {
      const p = path.join(ROOT, a.file);
      try {
        return !readFileSync(p, "utf8").split(/\r?\n/).some((l) => a.line.test(l));
      } catch {
        return true;
      }
    });
    expect(stale.map((a) => a.file)).toEqual([]);
  });
});

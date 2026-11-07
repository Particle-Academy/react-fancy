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

/**
 * The FAINT token is for decoration only. Its defaults (zinc-400 / zinc-500)
 * are 2.62:1 on the kit's white surface and 3.67:1 on its zinc-900 dark one,
 * under AA in both modes, so readable text on it fails WCAG 1.4.3 for every app
 * that sets no `--fancy-*` variable. 6.12.0 left placeholders, empty-value
 * text, column headers, step names and group headings on it; 6.13.0 moved
 * them to muted (`grey-text-contrast-faint` measures each one).
 *
 * Every line that uses `--fancy-text-faint` must be listed here, with the
 * reason it is not something a person reads. A new use fails until it is
 * either moved to muted or justified as decoration.
 */
const FAINT_DECORATIVE: Array<{ file: string; line: RegExp; reason: string }> = [
  { file: "Breadcrumbs/Breadcrumbs.tsx", line: /<ChevronRight .*aria-hidden="true"/, reason: "separator chevron, aria-hidden" },
  { file: "Chart/ChartAxis.tsx", line: /<line x1=\{tx\}/, reason: "x-axis tick mark beside a label" },
  { file: "Chart/ChartAxis.tsx", line: /<line x1=\{x - 4\}/, reason: "y-axis tick mark beside a label" },
  { file: "Chart/ChartLine.tsx", line: /^\s*className="text-\[color:var\(--fancy-text-faint,/, reason: "the dashed hover rule (an svg line)" },
  { file: "Command/CommandInput.tsx", line: /<Search .*aria-hidden="true"/, reason: "search icon beside a labelled input, aria-hidden" },
  { file: "FileBrowser/FileBrowserNewFolder.tsx", line: /<FolderPlus .*aria-hidden="true"/, reason: "folder glyph beside the input, aria-hidden" },
  { file: "FileBrowser/FileBrowserNode.tsx", line: /<Loader2 .*aria-hidden="true"/, reason: "spinner glyph, aria-hidden" },
  { file: "FileBrowser/FileBrowserPathBar.tsx", line: /<ChevronRight .*aria-hidden="true"/, reason: "path separator chevron, aria-hidden" },
  { file: "FileBrowser/FileBrowserToolbar.tsx", line: /<Search .*aria-hidden="true"/, reason: "filter icon, aria-hidden" },
  { file: "FileUpload/FileUploadList.tsx", line: /^\s*"text-\[color:var\(--fancy-text-faint,.*";$/, reason: "the FAINT constant: aria-hidden file glyphs" },
  { file: "Kbd/Kbd.tsx", line: /<span aria-hidden className="text-\[color:var\(--fancy-text-faint,/, reason: "key separator, aria-hidden" },
  { file: "MoodMeter/MoodMeter.tsx", line: /stroke-\[color:var\(--fancy-text-faint,/, reason: "quadrant axis strokes" },
  { file: "PromptInput/PromptInput.tsx", line: /<Icon name="paperclip" .*aria-hidden="true"/, reason: "attachment glyph, aria-hidden" },
  { file: "Timeline/Timeline.tsx", line: /\[scrollbar-color:var\(--fancy-text-faint,/, reason: "scrollbar thumb colour" },
  { file: "TimePicker/TimePicker.tsx", line: /<span aria-hidden="true" .*>:<\/span>/, reason: "the hours:minutes colon, aria-hidden" },
  { file: "Toast/ToastItem.tsx", line: /^\s*default: "text-\[color:var\(--fancy-text-faint,/, reason: "icon colour of the default variant, which draws no icon" },
  {
    file: "ActivityLight/ActivityLight.tsx",
    line: /^\s*quiet: "text-\[color:var\(--fancy-text-faint,/,
    reason:
      "one hue of a status ramp whose other levels (emerald/sky/amber-500) are also under AA as text; the ramp's optional count is an open finding for the owner, not settled here",
  },
];

function faintUses(): string[] {
  const out: string[] = [];
  for (const rel of componentFiles()) {
    const lines = readFileSync(path.join(ROOT, rel), "utf8").split(/\r?\n/);
    lines.forEach((raw, i) => {
      if (!raw.includes("--fancy-text-faint")) return;
      if (FAINT_DECORATIVE.some((a) => a.file === rel && a.line.test(raw))) return;
      out.push(`${rel}:${i + 1}`);
    });
  }
  return out;
}

describe("the faint token is decoration only", () => {
  it("no --fancy-text-faint outside the decorative allowlist (readable text reads muted)", () => {
    expect(faintUses()).toEqual([]);
  });

  it("every decorative exemption still matches a line (a stale exemption is a hole)", () => {
    const stale = FAINT_DECORATIVE.filter((a) => {
      try {
        return !readFileSync(path.join(ROOT, a.file), "utf8").split(/\r?\n/).some((l) => a.line.test(l));
      } catch {
        return true;
      }
    });
    expect(stale.map((a) => `${a.file} ${a.line}`)).toEqual([]);
  });
});

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

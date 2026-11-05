import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/**
 * Components lay out with LOGICAL sides, so they mirror under `dir="rtl"`.
 *
 * `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`/`border-s`/`rounded-e`
 * resolve against the writing direction; `ml-`/`pl-`/`left-`/`text-left`/
 * `border-l` do not, so one of them in a component is a piece of that component
 * that stays put while everything around it mirrors. Until 6.9.0 the kit had
 * no RTL handling at all, and a browser check under `dir="rtl"` failed 42
 * components.
 *
 * This is the cheap guard that keeps it that way. It does not render anything
 * (the real-browser check is in the 6.9.0 changelog entry); it reads the SOURCE
 * for the property that predicts the failure.
 *
 * Some physical sides are correct, and each is listed below with its reason:
 * a centred element (`left-1/2` + `-translate-x-1/2`), a symmetric pair, a
 * prop whose value is a physical side (`side="left"`), plotted axes, and
 * anything sitting over left-to-right code. The list is by exact file and
 * token, and a token that is no longer in its file FAILS the test, so the list
 * cannot quietly outlive what it excuses.
 */
const ALLOWED: Record<string, { tokens: string[]; why: string }> = {
  "components/AccordionPanel/AccordionPanel.Trigger.tsx": {
    tokens: ["before:left-1/2", "before:left-0", "before:right-0"],
    why: "a centred divider, and a full-width one: symmetric",
  },
  "components/Tooltip/Tooltip.tsx": {
    tokens: ["left-1/2", "right-[-4px]", "left-[-4px]"],
    why: "the arrow follows the PHYSICAL placement (`left` / `right` are screen sides), or is centred",
  },
  "components/MagicWand/MagicWand.tsx": {
    tokens: ["left-1/2", "border-r"],
    why: "a centred bubble, and its rotated arrow",
  },
  "components/MoodMeter/MoodMeter.tsx": {
    tokens: ["left-1.5", "right-1.5"],
    why: "corner labels of a plotted value/confidence field, which keeps its axes",
  },
  "components/Kanban/KanbanColumn.tsx": {
    tokens: ["left-0", "right-0"],
    why: "a full-width drop line: symmetric",
  },
  "components/ResizablePanels/ResizablePanels.tsx": {
    tokens: ["before:-left-1.5", "before:-right-1.5"],
    why: "a hit area on both sides of the separator: symmetric",
  },
  "components/CodeBlock/CodeBlock.tsx": {
    tokens: ["pr-12", "right-2"],
    why: "the copy button floats over left-to-right code, at the code's end",
  },
  "components/ContentRenderer/copy.tsx": {
    tokens: ["right-2"],
    why: "the copy button floats over left-to-right code, at the code's end",
  },
  "components/CodeView/CodeView.tsx": {
    tokens: ["left-0"],
    why: "inside the editor's dir=\"ltr\" root",
  },
  "components/Drawer/Drawer.tsx": {
    tokens: ["left-0", "right-0", "border-r", "border-l"],
    why: "`side=\"left\"` / `side=\"right\"` are physical by name; `start` / `end` are the logical sides",
  },
  "components/Toast/Toast.tsx": {
    tokens: ["right-4", "left-4"],
    why: "`*-left` / `*-right` positions are physical by name; `*-start` / `*-end` are logical",
  },
  "components/Toast/ToastStack.tsx": {
    tokens: ["right-4", "left-4"],
    why: "`*-left` / `*-right` positions are physical by name; `*-start` / `*-end` are logical",
  },
  "components/FauxClient/FauxClient.tsx": {
    tokens: ["origin-top-left", "rtl:origin-top-right"],
    why: "Tailwind has no logical transform-origin, so this PAIR is the inline-start origin",
  },
  "components/StatList/StatList.tsx": {
    tokens: ["text-left", "text-right"],
    why: "`align=\"left\"` / `align=\"right\"` are physical by name; `start` / `end` are logical",
  },
  "components/MobileMenu/MobileMenuFlyout.tsx": {
    tokens: ["left-0", "right-0"],
    why: "`side=\"left\"` / `side=\"right\"` are physical by name",
  },
};

const PHYSICAL = [
  /^-?m[lr]-/,
  /^-?p[lr]-/,
  /^-?(left|right)-/,
  /^border-[lr](-|$)/,
  /^rounded-[lr](-|$)/,
  /^rounded-(tl|tr|bl|br)(-|$)/,
  /^text-(left|right)$/,
  /^float-(left|right)$/,
  /^origin-(top|bottom)-(left|right)$/,
  /^scroll-[mp][lr]-/,
];

/** An inline style keyed by a physical margin or padding. */
const PHYSICAL_STYLE_KEY = /\b(marginLeft|marginRight|paddingLeft|paddingRight)\s*:|\{\s*(paddingLeft|paddingRight|marginLeft|marginRight)\s*\}/;

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

/** Whitespace-separated tokens inside string literals, comment lines skipped. */
function classTokens(src: string): string[] {
  const out: string[] = [];
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) continue;
    for (const lit of line.match(/"[^"\n]*"|'[^'\n]*'|`[^`\n]*`/g) ?? []) {
      for (const tok of lit.slice(1, -1).split(/\s+/)) if (tok) out.push(tok);
    }
  }
  return out;
}

/** The utility with its variants (`md:`, `[&_input]:`, `rtl:`) stripped. */
const bare = (tok: string) => tok.slice(tok.lastIndexOf(":") + 1).replace(/^!/, "");

const files = [...sources(join(SRC, "components")), ...sources(join(SRC, "hooks"))];
const rel = (f: string) => relative(SRC, f).split("\\").join("/");

describe("components use logical sides", () => {
  it("found the source tree", () => {
    // A bad path would make every check below pass by sweeping nothing.
    expect(files.length).toBeGreaterThan(200);
  });

  it("has no physical-side utility outside the justified list", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const allowed = new Set(ALLOWED[rel(file)]?.tokens ?? []);
      for (const tok of classTokens(readFileSync(file, "utf8"))) {
        if (PHYSICAL.some((re) => re.test(bare(tok))) && !allowed.has(tok)) offenders.push(`${rel(file)}: ${tok}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("has no inline style keyed by a physical margin or padding", () => {
    const offenders: string[] = [];
    for (const file of files) {
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        const t = line.trim();
        if (t.startsWith("//") || t.startsWith("*")) return;
        // Inside a quoted list of CSS property names (a style mirror) is not a style.
        if (/^"[a-zA-Z]+",?$/.test(t)) return;
        if (PHYSICAL_STYLE_KEY.test(line)) offenders.push(`${rel(file)}:${i + 1}: ${t}`);
      });
    }
    // CodeBlock's line-number gutter lives inside its dir="ltr" <pre>.
    expect(offenders.filter((o) => !o.startsWith("components/CodeBlock/CodeBlock.tsx:"))).toEqual([]);
  });

  it("every allowed token is still in its file, so the list cannot outlive its reasons", () => {
    const stale: string[] = [];
    for (const [file, { tokens }] of Object.entries(ALLOWED)) {
      const present = new Set(classTokens(readFileSync(join(SRC, file), "utf8")));
      for (const tok of tokens) if (!present.has(tok)) stale.push(`${file}: ${tok}`);
    }
    expect(stale).toEqual([]);
  });
});

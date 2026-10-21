// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { Input } from "../src/components/inputs/Input/Input";
import { Checkbox } from "../src/components/inputs/Checkbox/Checkbox";
import { CheckboxGroup } from "../src/components/inputs/CheckboxGroup/CheckboxGroup";
import { RadioGroup } from "../src/components/inputs/RadioGroup/RadioGroup";
import { Autocomplete } from "../src/components/Autocomplete/Autocomplete";
import { OtpInput } from "../src/components/OtpInput/OtpInput";
import { Pillbox } from "../src/components/Pillbox/Pillbox";
import { EmojiSelect } from "../src/components/EmojiSelect/EmojiSelect";
import { Card } from "../src/components/Card/Card";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Literal colours bypass every theme. TribeShare's colour audit (2026-10-21,
 * against 5.51.2) found them in the form controls, the overlays' dist CSS and
 * a dozen components; a host could repaint nothing they touched without
 * redefining zinc itself.
 *
 * Two checks:
 *  1. The components the audit named render their surface, border and text
 *     through `--fancy-*` tokens a host can set.
 *  2. No literal colour exists in component source except the ones that ENCODE
 *     DATA — chart series, file-type marks, mood and confidence scales, event
 *     kinds. Those are listed below with their reason and their exact values,
 *     so a new literal in an allowlisted file still fails. A value inside a
 *     `var(--fancy-…, <literal>)` fallback is a default, not a literal: the
 *     host can override it, which is the whole point.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function classesOf(host: HTMLElement): string {
  return [...host.querySelectorAll<HTMLElement>("*")]
    .map((el) => el.getAttribute("class") ?? "")
    .join(" ");
}

const opts = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

const CONTROLS: Array<[string, ReactElement]> = [
  ["Input", <Input key="i" placeholder="x" />],
  ["Checkbox", <Checkbox key="c" label="c" />],
  ["CheckboxGroup", <CheckboxGroup key="cg" list={opts} />],
  ["RadioGroup", <RadioGroup key="rg" list={opts} />],
  ["Autocomplete", <Autocomplete key="ac" options={opts} />],
  ["OtpInput", <OtpInput key="otp" length={4} />],
  ["Pillbox", <Pillbox key="pb" />],
  ["EmojiSelect", <EmojiSelect key="es" />],
];

describe("the audited form controls read tokens", () => {
  for (const [name, el] of CONTROLS) {
    it(`${name}: surface, outline and dark surface come from --fancy-* tokens`, () => {
      const { host, unmount } = mount(el);
      const cls = classesOf(host);
      // Light + dark field surface and the control's outline. EmojiSelect's
      // trigger has no light fill today (it is transparent on its parent), so it
      // gains none — only the dark field surface it always had.
      if (name !== "EmojiSelect") expect(cls, name).toMatch(/var\(--fancy-input,/);
      expect(cls, name).toMatch(/var\(--fancy-input-dark,/);
      expect(cls, name).toMatch(/var\(--fancy-(border|border-strong),/);
      // The raw literal the audit flagged must be gone from the DOM, except as
      // the token's own fallback.
      expect(cls.replace(/var\(--fancy-[a-z-]+,[^)\]]+\)/g, ""), name).not.toMatch(/#1e1e24/i);
      unmount();
    });
  }

  it("Card: surface, border and dark surface come from tokens", () => {
    const { host, unmount } = mount(<Card>body</Card>);
    const cls = classesOf(host);
    expect(cls).toMatch(/var\(--fancy-surface,/);
    expect(cls).toMatch(/var\(--fancy-surface-dark,/);
    expect(cls).toMatch(/var\(--fancy-border,/);
    unmount();
  });
});

/* ── 2. literal scan ─────────────────────────────────────────────────────── */

/** file (relative to src/components) -> the literals it may carry, and why. */
const DATA_LITERALS: Record<string, { reason: string; values: string[] }> = {
  "Chart/chart.utils.ts": {
    reason: "default series palette — each colour identifies a series",
    values: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"],
  },
  "Chart/ChartSparkline.tsx": { reason: "default series colour (a prop default)", values: ["#3b82f6"] },
  "ColorPicker/ColorPicker.tsx": { reason: "the default VALUE of a colour input, not styling", values: ["#3b82f6"] },
  "Avatar/Avatar.tsx": {
    reason: "glow colour per event kind (on / xp / achievement) — encodes the kind",
    values: ["#a855f7", "#22c55e", "#f59e0b"],
  },
  "FileBrowser/FileBrowserNode.tsx": {
    reason: "file-type marks (TypeScript blue, JS yellow, …) and the folder glyph",
    values: ["#3178c6", "#f7df1e", "#777bb4", "#e34c26", "#264de4", "#a1a1aa", "#71717a", "#cb171e", "#fbbf24"],
  },
  "TreeNav/TreeNode.tsx": {
    reason: "file-type marks and the folder glyph, same table as FileBrowser",
    values: ["#3178c6", "#f7df1e", "#777bb4", "#e34c26", "#264de4", "#a1a1aa", "#71717a", "#cb171e", "#fbbf24"],
  },
  "MoodMeter/MoodMeter.tsx": { reason: "mood-scale series colours (prop defaults)", values: ["#0ea5e9", "#a855f7"] },
  "PromptInput/PromptInput.tsx": {
    reason: "mention-kind marks (agent / file / person) and the confidence scale",
    values: ["#a855f7", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a1a1aa", "#71717a"],
  },
  "ReasonTag/ReasonTag.tsx": { reason: "confidence scale high / medium / low", values: ["#10b981", "#f59e0b", "#ef4444"] },
  "Kanban/KanbanColumn.tsx": { reason: "drop-indicator glow, an accent not a surface", values: ["rgba(59,130,246,0.15)"] },
  "StickyNote/StickyNote.tsx": { reason: "paper shadow (black alpha)", values: ["rgba(0,0,0,0.12)", "rgba(0,0,0,0.08)"] },
};

const LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|(?<=(?:fill|stroke|color)=")white(?=")/g;

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function componentFiles(): string[] {
  const root = path.resolve(__dirname, "../src/components");
  const out: string[] = [];
  (function walk(d: string) {
    for (const n of readdirSync(d)) {
      const p = path.join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) out.push(p);
    }
  })(root);
  return out.map((p) => path.relative(root, p).replace(/\\/g, "/"));
}

describe("no literal colour outside the data-encoding allowlist", () => {
  it("finds files to scan", () => {
    expect(componentFiles().length).toBeGreaterThan(200);
  });

  it("every literal colour in component source encodes data", () => {
    const root = path.resolve(__dirname, "../src/components");
    const stray: string[] = [];
    for (const rel of componentFiles()) {
      const src = stripComments(readFileSync(path.join(root, rel), "utf8"))
        // A token's fallback is overridable by definition.
        .replace(/var\(--fancy-[a-z-]+,\s*[^)\]]*\)?\)/g, "");
      const allowed = new Set((DATA_LITERALS[rel]?.values ?? []).map((v) => v.toLowerCase().replace(/\s/g, "")));
      for (const m of src.matchAll(LITERAL)) {
        const v = m[0].toLowerCase().replace(/\s/g, "");
        if (!allowed.has(v)) stray.push(`${rel}: ${m[0]}`);
      }
    }
    expect(stray).toEqual([]);
  });

  it("every allowlist entry still exists (a stale exemption is a hole)", () => {
    const files = new Set(componentFiles());
    expect(Object.keys(DATA_LITERALS).filter((f) => !files.has(f))).toEqual([]);
  });
});

/* ── 3. the distributed CSS ──────────────────────────────────────────────── */

describe("styles.css dark defaults read tokens", () => {
  const css = readFileSync(path.resolve(__dirname, "../src/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("every colour declaration in a dark rule goes through a --fancy-* token", () => {
    const stray: string[] = [];
    for (const m of css.matchAll(/([^{}]*\.dark[^{}]*)\{([^{}]*)\}/g)) {
      const selector = m[1].trim();
      // The transparency checkerboard is a convention (it encodes alpha), not
      // chrome — it stays neutral whatever the palette.
      if (selector.includes("fancy-checkerboard")) continue;
      for (const d of m[2].matchAll(/(background-color|border-color|color|box-shadow)\s*:\s*([^;]+);/g)) {
        if (!/var\(--fancy-/.test(d[2]) && !/var\(--color-/.test(d[2])) stray.push(`${selector} { ${d[1]}: ${d[2]} }`);
      }
    }
    expect(stray).toEqual([]);
  });
});

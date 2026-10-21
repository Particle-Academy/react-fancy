// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { MultiSwitch } from "../src/components/inputs/MultiSwitch/MultiSwitch";
import { Sidebar } from "../src/components/Sidebar";
import { Menu } from "../src/components/Menu";
import { Navbar } from "../src/components/Navbar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 5.53.1 — tribeshare's runtime audit against 5.53.0 found raw zinc that still
 * beat a host palette on nav-like items, in dark mode especially:
 *
 *  - MultiSwitch's unselected option label: `text-zinc-600 dark:text-zinc-400`
 *  - Sidebar.Item / Menu.Item inactive text (same pair) and their hover
 *    surface `hover:bg-zinc-50 dark:hover:bg-zinc-800/50`
 *
 * They were overriding these per instance. No 5.52.0 role reproduced either
 * pair exactly, so two roles were added: `text-subtle` (zinc-600 / zinc-400)
 * and `surface-hover` (zinc-50 / zinc-800 at 50%).
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function classesOf(host: HTMLElement): string {
  return [...host.querySelectorAll<HTMLElement>("*")].map((el) => el.getAttribute("class") ?? "").join(" ");
}

const CASES: Array<[string, ReactElement, { hover: boolean }]> = [
  ["MultiSwitch", <MultiSwitch key="ms" list={["Day", "Week"]} defaultValue="Day" />, { hover: false }],
  ["Sidebar.Item", <Sidebar key="sb"><Sidebar.Item>Home</Sidebar.Item></Sidebar>, { hover: true }],
  ["Sidebar.Submenu", <Sidebar key="sbs"><Sidebar.Submenu label="More"><Sidebar.Item>x</Sidebar.Item></Sidebar.Submenu></Sidebar>, { hover: true }],
  ["Menu.Item", <Menu key="m"><Menu.Item>Home</Menu.Item></Menu>, { hover: true }],
  ["Menu.Submenu", <Menu key="ms2"><Menu.Submenu label="More"><Menu.Item>x</Menu.Item></Menu.Submenu></Menu>, { hover: true }],
  ["Navbar.Item", <Navbar key="n"><Navbar.Item>Home</Navbar.Item></Navbar>, { hover: false }],
];

describe("inactive nav text and hover surfaces read tokens", () => {
  for (const [name, el, { hover }] of CASES) {
    it(`${name}: inactive label is text-subtle in both modes`, () => {
      const { host, unmount } = mount(el);
      const cls = classesOf(host);
      expect(cls, name).toContain("text-[color:var(--fancy-text-subtle,var(--color-zinc-600))]");
      expect(cls, name).toContain("dark:text-[color:var(--fancy-text-subtle-dark,var(--color-zinc-400))]");
      expect(cls.split(/\s+/), name).not.toContain("dark:text-zinc-400");
      if (hover) {
        expect(cls, name).toContain("hover:bg-[color:var(--fancy-surface-hover,var(--color-zinc-50))]");
        expect(cls, name).toContain("dark:hover:bg-[color:var(--fancy-surface-hover-dark,");
        expect(cls.split(/\s+/), name).not.toContain("dark:hover:bg-zinc-800/50");
      }
      unmount();
    });
  }
});

describe("kit-wide: no exact text-subtle / surface-hover pair is left on raw zinc", () => {
  it("finds none in component source", () => {
    const root = path.resolve(__dirname, "../src/components");
    const files: string[] = [];
    (function walk(d: string) {
      for (const n of readdirSync(d)) {
        const p = path.join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(n) && !/\.colors\.ts$/.test(n)) files.push(p);
      }
    })(root);
    expect(files.length).toBeGreaterThan(200);
    const left: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // The dark halves of the two pairs. Their light halves are too common
      // on their own (zinc-600 icons, zinc-50 wells) to search for alone.
      if (/(^|[\s"'`])dark:(hover:)?text-zinc-400\b/m.test(src) && /(^|[\s"'`])(hover:)?text-zinc-600\b/m.test(src)) {
        left.push(`${path.basename(f)}: text-zinc-600 / dark:text-zinc-400`);
      }
      if (/dark:hover:bg-zinc-800\/50/.test(src)) left.push(`${path.basename(f)}: dark:hover:bg-zinc-800/50`);
    }
    expect(left).toEqual([]);
  });
});

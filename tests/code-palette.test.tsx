// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { compile } from "tailwindcss";
import { DARK_COLORS, LIGHT_COLORS } from "@particle-academy/fancy-file-commons";
import { CodeBlock } from "../src/components/CodeBlock";
import { CodeView } from "../src/components/CodeView";
import {
  CODE_PALETTE_ATTR,
  CODE_PALETTE_DARK_CLASS,
  CODE_PALETTE_KEYS,
} from "../src/components/CodeView/code-palette";
import { mount } from "./content-renderer-helpers";

/**
 * CodeBlock and CodeView carry BOTH palettes, so server-rendered HTML is right
 * in either theme and a dark site does not flash light on hydration.
 *
 *  - the root declares `--fc-<key>-l` / `--fc-<key>-d` for every key it uses;
 *  - every coloured thing reads `var(--fc-<key>,var(--fc-<key>-l))`;
 *  - the root's `dark:[--fc-<key>:var(--fc-<key>-d)]` classes (compiled by the
 *    consumer's Tailwind, so they follow the consumer's `dark` variant) and a
 *    zero-specificity rule in styles.css (`.dark` / `[data-theme="dark"]`) set
 *    `--fc-<key>` to the dark value.
 *
 * jsdom resolves neither Tailwind classes nor `var()`, so these tests pin the
 * emitted attributes and classes, compile the classes with the real Tailwind
 * compiler, and match the styles.css selectors with the real selector engine.
 * The computed colour in a real browser is the coordinator's check.
 */

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const PRISM = 'use Prism\\Prism\\Facades\\Prism;\n$model = getenv("MODEL");';

const darkClass = (key: string) => `dark:[--fc-${key}:var(--fc-${key}-d)]`;
const varOf = (key: string) => `var(--fc-${key},var(--fc-${key}-l))`;

function codeBlockRoot(el = <CodeBlock code={PRISM} language="php" title="setup.php" showLineNumbers />) {
  return mount(el).host.querySelector<HTMLElement>("[data-react-fancy-code-block]")!;
}

describe("the shared code palette", () => {
  it("has a literal dark class for every key it declares", () => {
    const classes = CODE_PALETTE_DARK_CLASS.split(/\s+/);
    for (const key of CODE_PALETTE_KEYS) expect(classes).toContain(darkClass(key));
    expect(classes).toHaveLength(CODE_PALETTE_KEYS.length);
  });

  it("covers every token colour and the chrome the components paint", () => {
    for (const key of [
      "background", "foreground", "gutterBackground", "gutterForeground", "gutterBorder", "cursorColor",
      "keyword", "string", "comment", "number", "operator", "function", "type", "tag",
      "attribute", "attributeValue", "punctuation", "variable",
    ]) {
      expect(CODE_PALETTE_KEYS).toContain(key);
    }
  });
});

describe.each([
  ["CodeBlock", () => codeBlockRoot()],
  [
    "CodeView",
    () =>
      mount(<CodeView value={PRISM} language="php" readOnly />).host.querySelector<HTMLElement>(
        "[data-react-fancy-code-view]",
      )!,
  ],
])("%s", (_name, rootOf) => {
  it("declares both palettes on the root, and its dark classes", () => {
    const root = rootOf();
    expect(root.hasAttribute(CODE_PALETTE_ATTR)).toBe(true);
    for (const key of CODE_PALETTE_KEYS) {
      expect(root.style.getPropertyValue(`--fc-${key}-l`)).toBe(LIGHT_COLORS[key]);
      expect(root.style.getPropertyValue(`--fc-${key}-d`)).toBe(DARK_COLORS[key]);
      expect(root.classList.contains(darkClass(key))).toBe(true);
    }
  });

  it("paints through the variables: no literal colour on any element", () => {
    const root = rootOf();
    for (const el of [root, ...root.querySelectorAll<HTMLElement>("[style]")]) {
      const style = el.getAttribute("style")!;
      // Strip the palette declarations; what remains must hold no colour value.
      const painted = style.replace(/--fc-[A-Za-z]+-[ld]:\s*[^;]+;?/g, "");
      expect(painted, el.outerHTML.slice(0, 120)).not.toMatch(HEX);
      expect(painted).not.toMatch(/rgb\(/);
    }
    expect(root.getAttribute("style")).toContain(`background-color: ${varOf("background")}`);
  });

  it("highlights the PHP snippet without an open tag", () => {
    const root = rootOf();
    const spans = [...root.querySelectorAll<HTMLElement>("pre span[style]")];
    const colourOf = (text: string) => spans.find((s) => s.textContent === text)?.getAttribute("style");
    expect(colourOf("use")).toBe(`color:${varOf("keyword")}`);
    expect(colourOf("Facades")).toBe(`color:${varOf("type")}`);
    expect(colourOf("$model")).toBe(`color:${varOf("variable")}`);
    expect(colourOf("getenv")).toBe(`color:${varOf("function")}`);
    expect(colourOf('"MODEL"')).toBe(`color:${varOf("string")}`);
  });

  it("renders the same markup with or without .dark (nothing to flip on hydration)", () => {
    const light = rootOf().outerHTML;
    document.documentElement.classList.add("dark");
    try {
      expect(rootOf().outerHTML).toBe(light);
    } finally {
      document.documentElement.classList.remove("dark");
    }
  });
});

describe("CodeBlock snippet vs file", () => {
  it("a full PHP file still starts as inline HTML until <?php", () => {
    const src = "<h1>Title</h1>\n<?php echo $x; ?>";
    const root = codeBlockRoot(<CodeBlock code={src} language="php" />);
    const spans = [...root.querySelectorAll<HTMLElement>("pre span[style]")];
    expect(spans.find((s) => s.textContent === "h1")?.getAttribute("style")).toBe(`color:${varOf("tag")}`);
    expect(spans.find((s) => s.textContent === "<?php")?.getAttribute("style")).toBe(`color:${varOf("keyword")}`);
  });
});

describe("the dark switch actually compiles and matches", () => {
  const ROOT = path.resolve(__dirname, "..");
  const require = createRequire(import.meta.url);

  async function compileWith(entry: string, candidates: string[]): Promise<string> {
    const { build } = await compile(entry, {
      base: ROOT,
      loadStylesheet: async (id: string, base: string) => {
        const resolved = id.startsWith("tailwindcss")
          ? require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id)
          : path.resolve(base, id);
        return { path: resolved, base: path.dirname(resolved), content: await readFile(resolved, "utf8") };
      },
    });
    return build(candidates);
  }

  it("Tailwind generates a --fc-<key> dark declaration for every class", async () => {
    const out = await compileWith(
      ['@import "tailwindcss/theme.css";', '@import "./src/dark-variant.css";', '@import "tailwindcss/utilities.css";'].join("\n"),
      CODE_PALETTE_DARK_CLASS.split(/\s+/),
    );
    for (const key of CODE_PALETTE_KEYS) {
      expect(out).toContain(`--fc-${key}: var(--fc-${key}-d)`);
    }
    expect(out).toContain(".dark");
    expect(out).toContain('[data-theme="dark"]');
  });

  it("styles.css flips the palette under .dark or [data-theme=dark] without Tailwind", () => {
    const css = readFileSync(path.join(ROOT, "src/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = [...css.matchAll(/([^{};]+)\{([^}]*)\}/g)].find((m) => m[1].includes(CODE_PALETTE_ATTR));
    expect(rule, "a styles.css rule for the palette attribute").toBeTruthy();
    const [, selector, body] = rule!;
    for (const key of CODE_PALETTE_KEYS) expect(body).toContain(`--fc-${key}: var(--fc-${key}-d)`);

    document.body.innerHTML = `
      <div class="dark"><div ${CODE_PALETTE_ATTR} id="a"></div></div>
      <div data-theme="dark"><div ${CODE_PALETTE_ATTR} id="b"></div></div>
      <div class="dark" ${CODE_PALETTE_ATTR} id="c"></div>
      <div data-theme="light"><div ${CODE_PALETTE_ATTR} id="d"></div></div>
      <div ${CODE_PALETTE_ATTR} id="e"></div>`;
    const sel = selector.trim();
    expect(document.getElementById("a")!.matches(sel)).toBe(true);
    expect(document.getElementById("b")!.matches(sel)).toBe(true);
    expect(document.getElementById("c")!.matches(sel)).toBe(true);
    expect(document.getElementById("d")!.matches(sel)).toBe(false);
    expect(document.getElementById("e")!.matches(sel)).toBe(false);
  });
});

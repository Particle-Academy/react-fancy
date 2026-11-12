// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
// The AA palettes the components paint (code-palette-contrast.test.ts).
import { CODE_DARK_COLORS as DARK_COLORS, CODE_LIGHT_COLORS as LIGHT_COLORS } from "../src/components/CodeView/code-palette";

import { CodeBlock } from "../src/components/CodeBlock";
import { CodeView } from "../src/components/CodeView";

/**
 * Server rendering cannot know the theme, so the HTML must carry both palettes
 * and no light-only colour. Before this, `useIsDark` returned light on the
 * server and every token span had a literal light `color:#...`; a dark site
 * then flashed light until hydration re-rendered it.
 */

const PRISM = 'use Prism\\Prism\\Facades\\Prism;\n$model = getenv("MODEL");';

/** Every `style="..."` value in the HTML, with the palette declarations removed. */
function paintedStyles(html: string): string[] {
  return [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1].replace(/--fc-[A-Za-z]+-[ld]:[^;]+;?/g, ""));
}

describe.each([
  ["CodeBlock", () => renderToString(<CodeBlock code={PRISM} language="php" title="a.php" showLineNumbers />)],
  ["CodeBlock (no line numbers)", () => renderToString(<CodeBlock code={PRISM} language="php" />)],
  ["CodeView", () => renderToString(<CodeView value={PRISM} language="php" readOnly />)],
])("%s server output", (_name, render) => {
  afterEach(() => vi.unstubAllGlobals());

  it("contains both palettes", () => {
    vi.stubGlobal("navigator", undefined);
    expect(typeof window).toBe("undefined");
    const html = render();
    for (const key of ["background", "foreground", "keyword", "string", "variable", "function", "type"] as const) {
      expect(html).toContain(`--fc-${key}-l:${LIGHT_COLORS[key]}`);
      expect(html).toContain(`--fc-${key}-d:${DARK_COLORS[key]}`);
      expect(html).toContain(`dark:[--fc-${key}:var(--fc-${key}-d)]`);
    }
  });

  it("has no light-only inline colour left", () => {
    const html = render();
    for (const style of paintedStyles(html)) {
      expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(style).not.toMatch(/rgb\(/);
    }
    // ...and the tokens really are highlighted, through the variables.
    expect(html).toContain('style="color:var(--fc-keyword,var(--fc-keyword-l))">use</span>');
    expect(html).toContain('style="color:var(--fc-variable,var(--fc-variable-l))">$model</span>');
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Button } from "../src/components/Button";

/**
 * The default Button's text and border read the theme tokens, but its fill and
 * light hover were raw `bg-white` / `dark:bg-zinc-800` / `hover:bg-zinc-50` /
 * `hover:border-zinc-300`. So a host palette recoloured everything around a
 * default button except the button itself: a neutral grey slab on a themed
 * card (reported against 5.53.1). PR #37.
 *
 * jsdom does not compute Tailwind, so this pins the classes. Each token's
 * fallback is the colour the old utility produced, which the THEME_TOKENS
 * tests in theme-tokens.test.tsx enforce for every token class in the kit.
 */
function classesOf(markup: string): string[] {
  const match = markup.match(/class="([^"]*)"/);
  return (match?.[1] ?? "").split(/\s+/).filter(Boolean);
}

describe("default Button fill follows the theme tokens", () => {
  const cls = classesOf(renderToStaticMarkup(<Button>Sign in with a passkey</Button>));

  it("reads --fancy-surface for its light fill, falling back to white", () => {
    expect(cls).toContain("bg-[color:var(--fancy-surface,var(--color-white))]");
    expect(cls).not.toContain("bg-white");
  });

  it("reads --fancy-surface-muted-dark for its dark fill, falling back to zinc-800", () => {
    expect(cls).toContain("dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]");
    expect(cls).not.toContain("dark:bg-zinc-800");
  });

  it("reads the tokens for its light hover fill and border", () => {
    expect(cls).toContain("hover:bg-[color:var(--fancy-surface-hover,var(--color-zinc-50))]");
    expect(cls).toContain("hover:border-[color:var(--fancy-border-strong,var(--color-zinc-300))]");
    expect(cls).not.toContain("hover:bg-zinc-50");
    expect(cls).not.toContain("hover:border-zinc-300");
  });

  it("leaves a coloured Button alone", () => {
    const violet = classesOf(renderToStaticMarkup(<Button color="violet">Save</Button>));
    expect(violet.some((c) => c.includes("--fancy-surface"))).toBe(false);
  });
});

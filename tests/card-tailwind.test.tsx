// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compile } from "tailwindcss";
import { Card } from "../src/components/Card/Card";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * THE CLASS OF BUG THIS EXISTS FOR.
 *
 * Tailwind emits CSS by scanning source for LITERAL class strings. A class
 * built by interpolation — `` `after:${insetX[size]}` `` — lands in the DOM and
 * in no stylesheet: the feature silently does nothing, every unit test that
 * string-matches the class name still passes, `tsc` is happy, the build is
 * green. One of those was already caught by hand during Card's parity work;
 * the point of this file is that the next one cannot be missed by hand.
 *
 * So instead of asserting that a class NAME is present, this renders every
 * Card permutation, harvests the class names the components actually produced,
 * and asks the real Tailwind compiler whether each one generates a rule.
 *
 * It also catches plain typos (`rounded-t-xll`), which no amount of literal
 * discipline prevents.
 */

const require = createRequire(import.meta.url);

/**
 * The theme + utilities layers only — no preflight. Preflight is a fixed blob
 * that would triple the compile time and cannot affect whether a utility
 * exists.
 */
const ENTRY = [
  "@layer theme, base, components, utilities;",
  '@import "tailwindcss/theme.css" layer(theme);',
  '@import "tailwindcss/utilities.css" layer(utilities);',
].join("\n");

async function compileFor(candidates: string[]): Promise<string> {
  const { build } = await compile(ENTRY, {
    base: process.cwd(),
    loadStylesheet: async (id: string, base: string) => {
      const resolved = id.startsWith("tailwindcss")
        ? require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id)
        : path.resolve(base, id);

      return {
        path: resolved,
        base: path.dirname(resolved),
        content: await readFile(resolved, "utf8"),
      };
    },
  });

  return build(candidates);
}

/** How Tailwind writes a class name into a selector: escape anything unusual. */
function toSelector(className: string): string {
  return `.${className.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)}`;
}

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

const SIZES = ["xs", "sm", "md", "lg"] as const;
const PADDINGS = ["none", "xs", "sm", "md", "lg"] as const;
const VARIANTS = ["outlined", "elevated", "flat", "muted", "soft"] as const;
const SECTIONS = ["divided", "plain", "banded"] as const;
const EDGES = ["x", "top", "bottom", "all"] as const;

/** Every prop combination that can change a class, rendered and harvested. */
function everyCardTree(): ReactElement[] {
  const trees: ReactElement[] = [];

  const parts = (
    <>
      <Card.Media background="#000" />
      <Card.Header heading="h" description="d" actions={<button>a</button>} />
      <Card.Body>
        {EDGES.map((edges) => (
          <Card.Bleed key={edges} edges={edges}>
            x
          </Card.Bleed>
        ))}
      </Card.Body>
      <Card.Footer heading="f" actions={<button>b</button>} />
    </>
  );

  for (const size of SIZES) {
    for (const sections of SECTIONS) {
      for (const dividerInset of [false, true]) {
        trees.push(
          <Card size={size} sections={sections} dividerInset={dividerInset}>
            {parts}
          </Card>,
        );
      }
    }
  }

  // `padding` is the independent axis — it overrides the step `size` implies,
  // and the inset + bleed tables are keyed by IT, so every step has to render.
  for (const padding of PADDINGS) {
    trees.push(
      <Card padding={padding} dividerInset>
        {parts}
      </Card>,
    );
  }

  for (const variant of VARIANTS) {
    for (const highlight of [false, true]) {
      for (const interactive of [false, true]) {
        trees.push(
          <Card variant={variant} highlight={highlight} interactive={interactive}>
            {parts}
          </Card>,
        );
      }
    }
  }

  // Standalone sections pad themselves, from a table nothing else reaches.
  for (const size of SIZES) {
    trees.push(
      <Card.Header size={size} heading="standalone">
        <Card.Bleed edges="all">x</Card.Bleed>
      </Card.Header>,
    );
    trees.push(<Card.Footer size={size} heading="standalone" />);
  }

  return trees;
}

function harvest(): Set<string> {
  const classes = new Set<string>();

  for (const tree of everyCardTree()) {
    const { host, unmount } = mount(tree);
    for (const el of host.querySelectorAll<HTMLElement>("*")) {
      for (const cls of el.className.split(/\s+/)) {
        if (cls) classes.add(cls);
      }
    }
    unmount();
  }

  return classes;
}

describe("every class Card renders is a class Tailwind generates", () => {
  it("compiles all of them to real CSS", async () => {
    const classes = [...harvest()].sort();

    // A guard on the guard: if rendering ever stops producing classes, an
    // empty set would make every assertion below vacuously true.
    expect(classes.length).toBeGreaterThan(60);

    const css = await compileFor(classes);
    const missing = classes.filter((cls) => !css.includes(toSelector(cls)));

    expect(
      missing,
      "these classes are in the DOM and in no stylesheet — almost always a constructed class name",
    ).toEqual([]);
  });

  it("would notice a constructed class name", async () => {
    // Proving the check checks. `after:inset-x-${n}` is exactly the shape that
    // shipped once already; a scanner never sees it, so Tailwind never emits it.
    const css = await compileFor(["after:inset-x-4", "after:inset-x-[var(--nope)]x"]);

    expect(css).toContain(toSelector("after:inset-x-4"));
    expect(css).not.toContain(toSelector("after:inset-x-[var(--nope)]x"));
  });
});

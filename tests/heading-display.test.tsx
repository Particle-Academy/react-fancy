// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Heading } from "../src/components/Heading/Heading";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function classesOf(el: ReactElement): string[] {
  const { host, unmount } = mount(el);
  const cls = (host.firstElementChild?.className ?? "").split(/\s+/).filter(Boolean);
  unmount();
  return cls;
}

/**
 * Display sizes on `<Heading>`.
 *
 * The gallery's big-type style hand-rolled its own `<h1>` because this
 * component stopped at `2xl`. That is the failure worth guarding: the primitive
 * existing is not enough if it cannot reach the size the design needs.
 */
describe("Heading display sizes", () => {
  it("renders 7xl at display scale, the size the verification step names", () => {
    expect(classesOf(<Heading size="7xl">Big</Heading>)).toContain("text-9xl");
  });

  it("continues the existing ramp rather than re-basing it", () => {
    // The names are semantic steps, not Tailwind class names — `2xl` has meant
    // `text-4xl` since this component shipped. Re-basing so that `4xl` meant
    // `text-4xl` would silently shrink every heading already using `2xl`.
    expect(classesOf(<Heading size="2xl">A</Heading>)).toContain("text-4xl");

    const ramp: [NonNullable<Parameters<typeof Heading>[0]["size"]>, string][] = [
      ["3xl", "text-5xl"],
      ["4xl", "text-6xl"],
      ["5xl", "text-7xl"],
      ["6xl", "text-8xl"],
      ["7xl", "text-9xl"],
    ];

    for (const [size, expected] of ramp) {
      expect(classesOf(<Heading size={size}>A</Heading>), `size="${size}"`).toContain(expected);
    }
  });

  it("tightens tracking at display scale, and only there", () => {
    // Spacing tuned for body-adjacent headings reads loose once type is big —
    // the reason a hand-rolled h1 looked better than the component did.
    for (const size of ["3xl", "4xl"] as const) {
      expect(classesOf(<Heading size={size}>A</Heading>)).toContain("tracking-tight");
    }

    for (const size of ["5xl", "6xl", "7xl"] as const) {
      expect(classesOf(<Heading size={size}>A</Heading>)).toContain("tracking-tighter");
    }

    for (const size of ["xs", "sm", "md", "lg", "xl", "2xl"] as const) {
      const cls = classesOf(<Heading size={size}>A</Heading>).join(" ");
      expect(cls, `size="${size}" should not carry display tracking`).not.toContain("tracking-");
    }
  });

  it("leaves every pre-existing size untouched", () => {
    // The whole scale, pinned. An additive change that moves an existing step
    // is not additive.
    const before: [NonNullable<Parameters<typeof Heading>[0]["size"]>, string][] = [
      ["xs", "text-xs"],
      ["sm", "text-sm"],
      ["md", "text-base"],
      ["lg", "text-lg"],
      ["xl", "text-2xl"],
      ["2xl", "text-4xl"],
    ];

    for (const [size, expected] of before) {
      expect(classesOf(<Heading size={size}>A</Heading>), `size="${size}"`).toContain(expected);
    }
  });

  it("still honours as/weight/className at display scale", () => {
    const { host, unmount } = mount(
      <Heading as="h1" size="6xl" weight="medium" className="custom">
        Hero
      </Heading>,
    );
    const el = host.firstElementChild!;

    expect(el.tagName).toBe("H1");
    expect(el.className).toContain("font-medium");
    expect(el.className).toContain("custom");
    expect(el.className).toContain("text-8xl");
    unmount();
  });
});

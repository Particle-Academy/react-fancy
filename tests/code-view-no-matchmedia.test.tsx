// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CodeView } from "../src/components/CodeView";
import { mount } from "./content-renderer-helpers";

/**
 * jsdom has no `window.matchMedia`, and neither does any consumer's component
 * test. CodeView's old dark-mode hook called it unguarded and threw
 * "window.matchMedia is not a function" on mount. The hook is gone (the dark
 * palette is switched by CSS now, see code-palette.test.tsx), and this pins
 * that nothing on the render path reaches for matchMedia again.
 */
describe("CodeView without matchMedia", () => {
  it("renders, under .dark too, carrying the dark palette for CSS to apply", () => {
    expect(typeof window.matchMedia).not.toBe("function");
    const light = mount(<CodeView value="<p>x</p>" language="html" readOnly />);
    expect(light.host.querySelector("[data-react-fancy-code-view]")).toBeTruthy();

    document.documentElement.classList.add("dark");
    try {
      const dark = mount(<CodeView value="x" readOnly />);
      const root = dark.host.querySelector<HTMLElement>("[data-react-fancy-code-view]")!;
      expect(root.style.getPropertyValue("--fc-background-d")).toBe("#18181b");
      expect(root.style.backgroundColor).toBe("var(--fc-background,var(--fc-background-l))");
    } finally {
      document.documentElement.classList.remove("dark");
    }
  });
});

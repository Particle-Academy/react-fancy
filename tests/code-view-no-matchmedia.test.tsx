// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CodeView } from "../src/components/CodeView";
import { mount } from "./content-renderer-helpers";

/**
 * jsdom has no `window.matchMedia`, and neither does any consumer's component
 * test. CodeView's dark-mode hook called it unguarded and threw
 * "window.matchMedia is not a function" on mount; it must fall back to the
 * `.dark` class signal instead.
 */
describe("CodeView without matchMedia", () => {
  it("renders, and still follows the .dark class", () => {
    expect(typeof window.matchMedia).not.toBe("function");
    const light = mount(<CodeView value="<p>x</p>" language="html" readOnly />);
    expect(light.host.querySelector("[data-react-fancy-code-view]")).toBeTruthy();

    document.documentElement.classList.add("dark");
    try {
      const dark = mount(<CodeView value="x" readOnly />);
      const root = dark.host.querySelector<HTMLElement>("[data-react-fancy-code-view]")!;
      expect(root.style.backgroundColor).toBe("rgb(24, 24, 27)");
    } finally {
      document.documentElement.classList.remove("dark");
    }
  });
});

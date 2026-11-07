import { describe, expect, it } from "vitest";
import { parseOklch } from "./contrast-helper";

// CI's newer Tailwind writes an achromatic hue as `none`; the helper threw on it,
// which failed the 6.11.1 release run while the local install (older Tailwind) passed.
describe("contrast helper oklch parsing", () => {
  it("reads `none` as a zero hue", () => {
    expect(parseOklch("oklch(98.5% 0 none)")).toEqual(parseOklch("oklch(98.5% 0 0)"));
  });

  it("still reads a numeric hue", () => {
    expect(parseOklch("oklch(55.2% 0.016 285.938)")).toEqual([0.552, 0.016, 285.938]);
  });
});

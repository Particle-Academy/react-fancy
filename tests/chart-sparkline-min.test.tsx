import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart } from "../src/components/Chart";

/** The y coordinate of the line's first point, read off the path's `M x,y`. */
function firstY(markup: string): number {
  const m = /d="M([-\d.]+),([-\d.]+)/.exec(markup);
  if (!m) throw new Error(`no path in ${markup}`);
  return Number(m[2]);
}

/** Every y the path passes through as a vertex (M / L / the end of each C). */
function vertexYs(markup: string): number[] {
  const d = /d="([^"]*)"/.exec(markup)![1]!;
  const ys: number[] = [];
  for (const seg of d.match(/[MLC][^MLC]*/g) ?? []) {
    const nums = seg.slice(1).split(/[ ,]+/).filter(Boolean).map(Number);
    ys.push(nums[nums.length - 1]!);
  }
  return ys;
}

/**
 * Height 32 draws into [2, 30]: 30 is the bottom edge, 2 the top.
 *
 * Genie's heartbeat strip asked for this: with the scale starting at the data's
 * own minimum, a window where every minute had activity drew its quietest busy
 * minute on the floor, indistinguishable from an idle one.
 */
describe("Chart.Sparkline — min", () => {
  it("by default the data's minimum sits on the bottom edge (unchanged)", () => {
    const html = renderToStaticMarkup(<Chart.Sparkline data={[5, 6, 5, 7]} height={32} />);
    expect(firstY(html)).toBe(30);
  });

  it("min={0} puts zero on the bottom edge, so a busy minute is off the floor", () => {
    const html = renderToStaticMarkup(<Chart.Sparkline data={[5, 6, 5, 7]} height={32} min={0} />);
    // 5 of 7 up a 28px range from the bottom edge.
    expect(firstY(html)).toBeCloseTo(10, 5);
  });

  it("a flat series reads as flat-and-busy with min={0}, not as all-idle", () => {
    const flatDefault = renderToStaticMarkup(<Chart.Sparkline data={[4, 4, 4]} height={32} />);
    const flatZero = renderToStaticMarkup(<Chart.Sparkline data={[4, 4, 4]} height={32} min={0} />);
    expect(vertexYs(flatDefault).every((y) => y === 30)).toBe(true);
    expect(vertexYs(flatZero).every((y) => y === 2)).toBe(true);
  });

  it("a value below min extends the scale rather than drawing outside the box", () => {
    const html = renderToStaticMarkup(<Chart.Sparkline data={[-2, 3]} height={32} min={0} />);
    const ys = vertexYs(html);
    expect(Math.max(...ys)).toBeLessThanOrEqual(30);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(2);
    expect(firstY(html)).toBe(30);
  });
});

// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { TimeGrid } from "../src/components/TimeGrid/TimeGrid";
import type { TimeGridCell } from "../src/components/TimeGrid/TimeGrid.types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * TimeGrid mount bench (5.57.0) — 1 / 7 / 14 / 31 days x 240 slices, windowed,
 * in a 1280px container.
 *
 * A number in a spike note nobody re-runs stops being true, so the budget lives
 * here and fails the suite. It is NOT absolute milliseconds: CI runners are not
 * the machine the baseline came from. Each case is timed as a RATIO against a
 * reference mount measured in the same run — 2,000 plain divs carrying the same
 * kind of attributes a cell carries — so a slower machine slows both sides.
 *
 * Baseline machine: the owner's Windows 11 desktop, Node + jsdom under vitest,
 * 2026-10-21. Ratios measured there are in RECORDED; the budget is RECORDED x
 * HEADROOM, generous on purpose (jsdom timing is noisy), so this catches a
 * regression of the "a cell got 3x heavier" kind, not a 10% drift.
 *
 * It does NOT prove windowing works: at 1280px the window already holds most of
 * 240 columns, so windowed and unwindowed cost about the same here. Windowing
 * itself is pinned by counting rendered cells in time-grid-windowing.test.tsx.
 * The browser numbers that matter (Chrome, 4x CPU throttle) are in the
 * CHANGELOG entry for 5.57.0.
 */

const COLS = 240;
const VIEW = 1280;
const HEADROOM = 2.5;
// Median of five runs on the baseline machine, 2026-10-22. The ratio is noisy
// (31d ranged 3.83 to 9.40), which is why HEADROOM is 2.5.
const RECORDED: Record<number, number> = { 1: 0.32, 7: 1.22, 14: 2.79, 31: 6.38 };

beforeAll(() => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute("data-react-fancy-timegrid") ? VIEW : 0;
  });
});
afterAll(() => vi.restoreAllMocks());

function timeMount(render: () => JSX.Element): number {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const t0 = performance.now();
  act(() => root.render(render()));
  const t = performance.now() - t0;
  act(() => root.unmount());
  host.remove();
  return t;
}

const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function reference(): JSX.Element {
  const out = [];
  for (let i = 0; i < 2000; i++) {
    out.push(<div key={i} id={`ref-${i}`} role="gridcell" aria-label={`Ref ${i} Open`} aria-selected={false} className="relative m-px rounded-sm bg-emerald-500" />);
  }
  return <div>{out}</div>;
}

const STATES = { open: { tone: "emerald" as const, label: "Open" }, closed: { label: "Closed" }, booked: { tone: "rose" as const, label: "Booked" } };
function grid(days: number) {
  const rows = Array.from({ length: days }, (_, i) => `D${i + 1}`);
  const cols = Array.from({ length: COLS }, (_, i) => String(i));
  const cells: TimeGridCell[][] = rows.map((_, r) =>
    cols.map((__, c): TimeGridCell => {
      const k = (r * 7 + c) % 40;
      return k < 8 ? { state: "closed" } : k < 11 ? { state: "booked", disabled: true, reasons: ["Booked"] } : { state: "open" };
    }),
  );
  return () => <TimeGrid rows={rows} cols={cols} cells={cells} states={STATES} cellWidth={6} cellHeight={14} windowColumns />;
}

describe("TimeGrid mount bench (ratio to an in-run reference)", () => {
  const results: string[] = [];
  afterAll(() => console.log("TimeGrid bench, ratio to reference:\n" + results.join("\n")));

  it.each([1, 7, 14, 31])("%i days x 240 stays within its budget", (days) => {
    timeMount(reference); // warm
    timeMount(grid(days));
    const ref = median([timeMount(reference), timeMount(reference), timeMount(reference)]);
    const t = median([timeMount(grid(days)), timeMount(grid(days)), timeMount(grid(days))]);
    const ratio = t / ref;
    results.push(`${days}d: ${t.toFixed(1)} ms / ref ${ref.toFixed(1)} ms = ${ratio.toFixed(2)} (budget ${(RECORDED[days] * HEADROOM).toFixed(2)})`);
    expect(ratio).toBeLessThan(RECORDED[days] * HEADROOM);
    // Eight mounts of up to 31 rows; under a parallel full suite this passed 5s.
  }, 30_000);
});

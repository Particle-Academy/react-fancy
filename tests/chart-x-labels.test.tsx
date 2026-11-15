// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart } from "../src/components/Chart";

/**
 * X-axis label control (reported by the Prism estate's lab): with many bars,
 * every category drew its own tick label, so 30 dated labels overlapped into an
 * unreadable smear. The same strings key the bars and head the tooltip, so a
 * caller could not shorten them without losing the full date.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATES = Array.from({ length: 30 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
const SERIES = [
  { label: "North", data: DATES.map((_, i) => (i % 7) + 1) },
  { label: "South", data: DATES.map((_, i) => (i % 5) + 2) },
];

/** Every SVG tick `<text>` whose content is one of `wanted`, with its x. */
function xTicks(markup: string, wanted: readonly string[]): { x: number; text: string }[] {
  const set = new Set(wanted);
  const out: { x: number; text: string }[] = [];
  for (const m of markup.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const text = m[2]!;
    if (!set.has(text)) continue;
    const x = /\bx="([-\d.]+)"/.exec(m[1]!);
    out.push({ x: Number(x?.[1]), text });
  }
  return out;
}

/** A deliberately generous width for a 10px label: 0.6em per character. */
function width10px(text: string): number {
  return text.length * 6;
}

function expectNoOverlap(ticks: { x: number; text: string }[]) {
  for (let i = 1; i < ticks.length; i++) {
    const a = ticks[i - 1]!;
    const b = ticks[i]!;
    const room = b.x - a.x;
    const need = (width10px(a.text) + width10px(b.text)) / 2;
    expect(room, `"${a.text}" at ${a.x} and "${b.text}" at ${b.x}`).toBeGreaterThanOrEqual(need);
  }
}

const SHORT = DATES.map((d) => d.slice(5));

describe.each([
  ["StackedBar", (p: Record<string, unknown>) => <Chart.StackedBar labels={DATES} series={SERIES} {...p} />],
  ["Line", (p: Record<string, unknown>) => <Chart.Line labels={DATES} series={SERIES} animate={false} {...p} />],
  ["Area", (p: Record<string, unknown>) => <Chart.Area labels={DATES} series={SERIES} animate={false} {...p} />],
])("Chart.%s with 30 dated labels", (_name, render) => {
  it("does not draw 30 overlapping ticks by default", () => {
    const ticks = xTicks(renderToStaticMarkup(render({})), DATES);
    expect(ticks.length).toBeLessThan(30);
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks[0]!.text).toBe(DATES[0]);
    expectNoOverlap(ticks);
  });

  it("xLabelInterval={5} shows every 5th label", () => {
    const ticks = xTicks(renderToStaticMarkup(render({ xLabelInterval: 5 })), DATES);
    expect(ticks.map((t) => t.text)).toEqual([0, 5, 10, 15, 20, 25].map((i) => DATES[i]));
  });

  it("xLabelInterval={1} opts back into every label", () => {
    expect(xTicks(renderToStaticMarkup(render({ xLabelInterval: 1 })), DATES)).toHaveLength(30);
  });

  it('xTickFormat="date-short" shows MM-DD, and auto thins on the SHORT width', () => {
    const html = renderToStaticMarkup(render({ xTickFormat: "date-short" }));
    expect(xTicks(html, DATES)).toHaveLength(0);
    const ticks = xTicks(html, SHORT);
    expect(ticks[0]!.text).toBe("10-01");
    // Shorter labels need less room, so more of them fit than with the full dates.
    expect(ticks.length).toBeGreaterThan(xTicks(renderToStaticMarkup(render({})), DATES).length);
    expectNoOverlap(ticks);
  });

  it("a function xTickFormat gets (label, index) and changes only the tick", () => {
    const seen: [string, number][] = [];
    const html = renderToStaticMarkup(
      render({
        xLabelInterval: 10,
        xTickFormat: (label: string, index: number) => {
          seen.push([label, index]);
          return `#${index}`;
        },
      }),
    );
    expect(xTicks(html, ["#0", "#10", "#20"]).map((t) => t.text)).toEqual(["#0", "#10", "#20"]);
    expect(seen).toContainEqual([DATES[10], 10]);
  });

  it("keeps every FULL label available to screen readers", () => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(render({ xTickFormat: "date-short" }));
    const list = host.querySelector("[data-react-fancy-chart-x-labels]");
    expect(list).not.toBeNull();
    expect([...list!.querySelectorAll("li")].map((li) => li.textContent)).toEqual(DATES);
    // The shortened ticks are hidden from assistive tech, so nothing is read twice.
    for (const t of host.querySelectorAll("svg text")) {
      if (SHORT.includes(t.textContent ?? "")) expect(t.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

describe("small charts are unchanged by the auto default", () => {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  it.each([
    ["Line", <Chart.Line key="l" labels={MONTHS} series={[{ label: "s", data: MONTHS.map((_, i) => i) }]} animate={false} />],
    ["StackedBar", <Chart.StackedBar key="s" labels={MONTHS} series={[{ label: "s", data: MONTHS.map((_, i) => i) }]} />],
    ["Line (years)", <Chart.Line key="y" labels={["2021", "2022", "2023", "2024", "2025"]} series={[{ label: "s", data: [1, 2, 3, 4, 5] }]} />],
  ])("%s draws every label", (_n, el) => {
    const html = renderToStaticMarkup(el);
    const labels = (el.props as { labels: string[] }).labels;
    expect(xTicks(html, labels).map((t) => t.text)).toEqual(labels);
  });
});

describe("the tooltip keeps the full label", () => {
  let root: Root | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  it("StackedBar with date-short ticks still heads the tooltip with the full date", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(<Chart.StackedBar labels={DATES} series={SERIES} xTickFormat="date-short" />));
    const bars = host.querySelectorAll("svg > g > rect");
    act(() => {
      bars[2 * SERIES.length]!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }));
    });
    const heading = [...host.querySelectorAll("div.font-medium")].map((d) => d.textContent);
    expect(heading).toContain(DATES[2]);
  });
});

describe("Chart.Bar", () => {
  const data = DATES.map((label, i) => ({ label, value: (i % 6) + 1 }));
  function labelRow(html: string): string[] {
    const host = document.createElement("div");
    host.innerHTML = html;
    return [...host.querySelectorAll("[data-react-fancy-chart-bar-label]")].map((d) => d.textContent ?? "");
  }

  it("xLabelInterval + xTickFormat thin and shorten the label row, one slot per bar", () => {
    const row = labelRow(renderToStaticMarkup(<Chart.Bar data={data} xLabelInterval={10} xTickFormat="date-short" />));
    expect(row).toHaveLength(30);
    expect(row.filter(Boolean)).toEqual(["10-01", "10-11", "10-21"]);
  });

  it("keeps every full label for screen readers", () => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<Chart.Bar data={data} xTickFormat="date-short" />);
    const list = host.querySelector("[data-react-fancy-chart-x-labels]");
    expect([...list!.querySelectorAll("li")].map((li) => li.textContent)).toEqual(DATES);
  });

  it('"auto" thins against the measured width once mounted', () => {
    const widthSpy = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const r = createRoot(host);
    try {
      act(() => r.render(<Chart.Bar data={data} />));
      const row = [...host.querySelectorAll("[data-react-fancy-chart-bar-label]")].map((d) => d.textContent ?? "");
      const shown = row.filter(Boolean);
      expect(row).toHaveLength(30);
      expect(shown.length).toBeLessThan(30);
      expect(shown.length).toBeGreaterThan(1);
      expect(shown[0]).toBe(DATES[0]);
    } finally {
      act(() => r.unmount());
      widthSpy.mockRestore();
      host.remove();
    }
  });

  it("a few short labels are all shown", () => {
    const few = [{ label: "Jan", value: 1 }, { label: "Feb", value: 2 }, { label: "Mar", value: 3 }];
    expect(labelRow(renderToStaticMarkup(<Chart.Bar data={few} />))).toEqual(["Jan", "Feb", "Mar"]);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Calendar } from "../src/components/Calendar/Calendar";
import type { CalendarDayContext } from "../src/components/Calendar/Calendar.types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Calendar per-day hooks + controlled visible month (5.56.0).
 * Spec: .ai/plans/react-fancy-tribeshare.md section 2. A month view where each
 * day shows its own state, carries a stable id, and opens that day on click.
 */

const mounted: Array<() => void> = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

const OCT_2026 = new Date(2026, 9, 1);
const day = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLButtonElement>(`[data-react-fancy-calendar-day="${id}"]`);
const heading = (host: HTMLElement) => host.querySelector("[data-react-fancy-calendar-month]")?.textContent;
const click = (el: Element | null) =>
  act(() => {
    (el as HTMLElement).click();
  });

describe("Calendar — stable date ids", () => {
  it("every day cell carries a YYYY-MM-DD id in local time, outside days too", () => {
    const { host } = mount(<Calendar visibleMonth={OCT_2026} />);
    const days = host.querySelectorAll("[data-react-fancy-calendar-day]");
    expect(days).toHaveLength(42);
    expect(day(host, "2026-10-01")).not.toBeNull();
    expect(day(host, "2026-10-31")).not.toBeNull();
    // Oct 1 2026 is a Thursday: Sun 27 Sep .. Wed 30 Sep lead the grid.
    const lead = day(host, "2026-09-27");
    expect(lead?.hasAttribute("data-outside-month")).toBe(true);
    expect(day(host, "2026-10-15")?.hasAttribute("data-outside-month")).toBe(false);
  });

  it("dateId replaces the id", () => {
    const { host } = mount(
      <Calendar visibleMonth={OCT_2026} dateId={(d) => `day-${d.getMonth() + 1}-${d.getDate()}`} />,
    );
    expect(day(host, "day-10-15")).not.toBeNull();
  });
});

describe("Calendar — per-day rendering", () => {
  it("renderDay draws the day's content and gets the full context", () => {
    const seen: CalendarDayContext[] = [];
    const { host } = mount(
      <Calendar
        visibleMonth={OCT_2026}
        value={new Date(2026, 9, 9)}
        disabledDates={[new Date(2026, 9, 10)]}
        renderDay={(ctx) => {
          seen.push(ctx);
          return <span data-probe="">{`${ctx.date.getDate()}*`}</span>;
        }}
      />,
    );
    expect(day(host, "2026-10-05")?.querySelector("[data-probe]")?.textContent).toBe("5*");
    const sel = seen.find((c) => c.id === "2026-10-09")!;
    expect(sel).toMatchObject({ selected: true, disabled: false, outsideMonth: false, inRange: false });
    expect(seen.find((c) => c.id === "2026-10-10")).toMatchObject({ disabled: true, selected: false });
    expect(seen.find((c) => c.id === "2026-09-27")).toMatchObject({ outsideMonth: true });
  });

  it("dayClassName adds the host's classes to that day only", () => {
    const { host } = mount(
      <Calendar
        visibleMonth={OCT_2026}
        dayClassName={(ctx) => (ctx.id === "2026-10-12" ? "probe-covered" : undefined)}
      />,
    );
    expect(day(host, "2026-10-12")?.className).toContain("probe-covered");
    expect(day(host, "2026-10-13")?.className).not.toContain("probe-covered");
  });

  it("a shaded day carries an accessible label, not colour alone", () => {
    const covered = (id: string) => id === "2026-10-12";
    const { host } = mount(
      <Calendar
        visibleMonth={OCT_2026}
        dayClassName={(ctx) => (covered(ctx.id) ? "bg-emerald-100" : undefined)}
        dayAriaLabel={(ctx) => (covered(ctx.id) ? "12 October, fully covered" : undefined)}
      />,
    );
    const shaded = day(host, "2026-10-12")!;
    expect(shaded.className).toContain("bg-emerald-100");
    expect(shaded.getAttribute("aria-label")).toBe("12 October, fully covered");
    // An unshaded day keeps its default name.
    expect(day(host, "2026-10-13")?.hasAttribute("aria-label")).toBe(false);
  });

  it("a click still selects the day (single mode) — opening it is the host's onChange", () => {
    const onChange = vi.fn();
    const { host } = mount(<Calendar visibleMonth={OCT_2026} onChange={onChange} />);
    click(day(host, "2026-10-20"));
    const d = onChange.mock.calls[0][0] as Date;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 20]);
  });
});

describe("Calendar — controlled visible month", () => {
  it("shows the month it is given", () => {
    const { host } = mount(<Calendar visibleMonth={new Date(2027, 1, 17)} />);
    expect(heading(host)).toBe("February 2027");
  });

  it("proposes a month change and does not move unless the host accepts", () => {
    const onMonth = vi.fn();
    const { host } = mount(<Calendar visibleMonth={OCT_2026} onVisibleMonthChange={onMonth} />);
    click(host.querySelector('[aria-label="Next month"]'));
    const m = onMonth.mock.calls[0][0] as Date;
    expect([m.getFullYear(), m.getMonth(), m.getDate()]).toEqual([2026, 10, 1]);
    expect(heading(host)).toBe("October 2026");
  });

  it("round-trips through a host that accepts, across a year end", () => {
    function Host() {
      const [m, setM] = useState(new Date(2026, 11, 1));
      return <Calendar visibleMonth={m} onVisibleMonthChange={setM} />;
    }
    const { host } = mount(<Host />);
    click(host.querySelector('[aria-label="Next month"]'));
    expect(heading(host)).toBe("January 2027");
    click(host.querySelector('[aria-label="Previous month"]'));
    click(host.querySelector('[aria-label="Previous month"]'));
    expect(heading(host)).toBe("November 2026");
  });

  it("uncontrolled still reports the month it moved to", () => {
    const onMonth = vi.fn();
    const { host } = mount(<Calendar onVisibleMonthChange={onMonth} />);
    const before = heading(host);
    click(host.querySelector('[aria-label="Next month"]'));
    expect(onMonth).toHaveBeenCalledTimes(1);
    expect(heading(host)).not.toBe(before);
    const m = onMonth.mock.calls[0][0] as Date;
    expect(m.getDate()).toBe(1);
  });
});

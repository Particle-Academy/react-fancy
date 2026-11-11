// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { Tabs } from "../src/components/Tabs";
import type { TabsVariant } from "../src/components/Tabs/Tabs.types";
import { expectText, mount, unmountAll } from "./contrast-assert";

/**
 * K2 + K3 from the lab's full-kit benchmark (2026-11-10).
 *
 * K2: an inactive `pills` (and `boxed`) tab sat on the muted token, zinc-500 on
 * the zinc-100 list: 4.39:1, under AA. Measured from the rendered classes, in
 * light and dark, against the list's own fill.
 *
 * K3: an inactive panel was unmounted, so its content never reached the
 * server-rendered HTML. `keepMounted` renders every panel; the inactive ones
 * carry `hidden` (WAI-ARIA tabs pattern: an inactive tabpanel is hidden).
 */

afterEach(() => unmountAll());

const tabs = (variant: TabsVariant, extra: Record<string, unknown> = {}) => (
  <Tabs variant={variant} defaultTab="monthly" {...extra}>
    <Tabs.List>
      <Tabs.Tab value="monthly">Monthly</Tabs.Tab>
      <Tabs.Tab value="yearly">Yearly</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panels>
      <Tabs.Panel value="monthly">$9/month</Tabs.Panel>
      <Tabs.Panel value="yearly">$90/year</Tabs.Panel>
    </Tabs.Panels>
  </Tabs>
);

describe("Tabs: inactive tab text contrast (K2)", () => {
  for (const variant of ["pills", "boxed", "underline"] as const) {
    it(`${variant}: an inactive tab clears 4.5:1 on the list`, () => {
      const { host } = mount(tabs(variant));
      const inactive = host.querySelector('[role="tab"][aria-selected="false"]');
      expect(inactive?.textContent).toBe("Yearly");
      expectText(`${variant} inactive tab`, inactive);
    });
  }
});

describe("Tabs keepMounted (K3)", () => {
  it("renders every panel on the server, the inactive one hidden", () => {
    const html = renderToString(tabs("pills", { keepMounted: true }));
    expect(html).toContain("$9/month");
    expect(html).toContain("$90/year");

    const doc = new DOMParser().parseFromString(html, "text/html");
    const panels = [...doc.querySelectorAll('[role="tabpanel"]')];
    expect(panels).toHaveLength(2);
    expect(panels[0].hasAttribute("hidden")).toBe(false);
    expect(panels[1].hasAttribute("hidden")).toBe(true);
    expect(panels[1].getAttribute("data-state")).toBe("inactive");
  });

  it("swaps which panel is hidden when the tab changes, without remounting", () => {
    const { host } = mount(tabs("pills", { keepMounted: true }));
    const yearlyPanel = [...host.querySelectorAll('[role="tabpanel"]')][1];
    act(() => {
      host.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    });
    const panels = [...host.querySelectorAll('[role="tabpanel"]')];
    expect(panels[1]).toBe(yearlyPanel);
    expect(panels[1].hasAttribute("hidden")).toBe(false);
    expect(panels[0].hasAttribute("hidden")).toBe(true);
  });

  it("a single panel can opt in on its own", () => {
    const html = renderToString(
      <Tabs defaultTab="a">
        <Tabs.Panels>
          <Tabs.Panel value="a">A</Tabs.Panel>
          <Tabs.Panel value="b" keepMounted>
            B-content
          </Tabs.Panel>
          <Tabs.Panel value="c">C-content</Tabs.Panel>
        </Tabs.Panels>
      </Tabs>,
    );
    expect(html).toContain("B-content");
    expect(html).not.toContain("C-content");
  });

  it("without keepMounted an inactive panel still unmounts (unchanged default)", () => {
    const html = renderToString(tabs("pills"));
    expect(html).toContain("$9/month");
    expect(html).not.toContain("$90/year");
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, createRef, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Tabs } from "../src/components/Tabs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Roving tabindex with no active tab.
 *
 * `Tabs.Tab` set `tabIndex={isActive ? 0 : -1}`, so when the controlled
 * `activeTab` matched no tab (a consumer's route can show a view that has no
 * tab) every tab was -1 and the tablist could not be reached by keyboard at
 * all. The first enabled tab now takes the stop in that case.
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

const tabs = (host: HTMLElement) => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
const stops = (host: HTMLElement) => tabs(host).filter((t) => t.tabIndex === 0);

function Fixture({ active, firstDisabled = false }: { active: string; firstDisabled?: boolean }) {
  return (
    <Tabs activeTab={active} onTabChange={() => {}}>
      <Tabs.List>
        <Tabs.Tab value="inbox" disabled={firstDisabled}>
          Inbox
        </Tabs.Tab>
        <Tabs.Tab value="sent">Sent</Tabs.Tab>
        <Tabs.Tab value="drafts">Drafts</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}

describe("Tabs roving tabindex", () => {
  it("gives the first tab the stop when the controlled value matches none", () => {
    const { host } = mount(<Fixture active="settings" />);
    expect(stops(host)).toHaveLength(1);
    expect(stops(host)[0].textContent).toBe("Inbox");
  });

  it("skips a disabled first tab", () => {
    const { host } = mount(<Fixture active="settings" firstDisabled />);
    expect(stops(host)).toHaveLength(1);
    expect(stops(host)[0].textContent).toBe("Sent");
  });

  it("keeps exactly one stop, on the active tab, when the value matches", () => {
    const { host } = mount(<Fixture active="drafts" />);
    expect(stops(host)).toHaveLength(1);
    expect(stops(host)[0].textContent).toBe("Drafts");
  });

  it("moves the stop between the fallback and the active tab as the value changes", () => {
    const { host, rerender } = mount(<Fixture active="nowhere" />);
    expect(stops(host).map((t) => t.textContent)).toEqual(["Inbox"]);

    rerender(<Fixture active="sent" />);
    expect(stops(host).map((t) => t.textContent)).toEqual(["Sent"]);

    rerender(<Fixture active="nowhere" />);
    expect(stops(host).map((t) => t.textContent)).toEqual(["Inbox"]);
  });

  it("still forwards a caller's ref to the tab", () => {
    const ref = createRef<HTMLButtonElement>();
    mount(
      <Tabs activeTab="x" onTabChange={() => {}}>
        <Tabs.List>
          <Tabs.Tab value="a" ref={ref}>
            A
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>,
    );
    expect(ref.current?.tagName).toBe("BUTTON");
    expect(ref.current?.tabIndex).toBe(0);
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "../src/components/Sidebar";

/**
 * 6.1.0 added `navLabel`, `keyboardNav`, `dot` / `dotLabel` and
 * `collapsedBadge`, all opt-in. These snapshots were WRITTEN BY 6.0.0, before
 * any of that existed, so a diff here is a change to what every existing
 * Sidebar consumer renders. Keep them byte-identical unless the change is
 * deliberate, and say so here when it is.
 */

const icon = <svg data-icon="" />;

function tree(collapsed: boolean): ReactElement {
  return (
    <Sidebar collapsed={collapsed}>
      <Sidebar.Toggle />
      <Sidebar.Group label="Main">
        <Sidebar.Item href="/" icon={icon} active>Home</Sidebar.Item>
        <Sidebar.Item icon={icon} badge={<span>3</span>}>Inbox</Sidebar.Item>
        <Sidebar.Item disabled>Archive</Sidebar.Item>
      </Sidebar.Group>
      <Sidebar.Submenu label="Reports" icon={icon} defaultOpen>
        <Sidebar.Item>Monthly</Sidebar.Item>
      </Sidebar.Submenu>
    </Sidebar>
  );
}

describe("Sidebar default markup is unchanged", () => {
  it("expanded", () => {
    expect(renderToStaticMarkup(tree(false))).toMatchSnapshot();
  });

  it("collapsed (icons)", () => {
    expect(renderToStaticMarkup(tree(true))).toMatchSnapshot();
  });

  it("collapsed (letters)", () => {
    expect(
      renderToStaticMarkup(
        <Sidebar collapsed collapseMode="letters">
          <Sidebar.Item icon={icon} badge={<span>3</span>}>Inbox</Sidebar.Item>
        </Sidebar>,
      ),
    ).toMatchSnapshot();
  });
});

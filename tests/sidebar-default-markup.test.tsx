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
 *
 * DELIBERATE CHANGE, 6.2.0: the "expanded" snapshot gained ONE element,
 * `<span class="sr-only"> </span>`, between the label and the badge of the
 * item WITH a badge (Inbox). It is visually hidden text only, no visual
 * change: without it the label and badge concatenated in the accessible name
 * ("Inbox3"). Items without a badge, and both collapsed snapshots, are
 * byte-identical to 6.0.0. Nothing else may change here.
 *
 * DELIBERATE CHANGE, 6.12.0: the collapse toggle's colour classes moved from
 * bare `text-zinc-400` / `hover:text-zinc-600` / `dark:hover:text-zinc-300` to
 * the `--fancy-text-muted` and `--fancy-text-soft` tokens (the grey-text
 * sweep; the glyph was 2.62:1 in light, under the 3:1 a control owes). Class
 * strings on the toggle only; no element or attribute changed.
 *
 * DELIBERATE CHANGE, 6.13.0: the group heading ("Main") moved from the faint
 * token to muted (zinc-400 / zinc-500 to zinc-500 / zinc-400): readable text
 * on faint was 2.62:1 in light, under AA. One class string on that `<p>` in
 * the "expanded" snapshot; no element or attribute changed, and the collapsed
 * snapshots (which draw no heading) are untouched.
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

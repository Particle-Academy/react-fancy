// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "../src/components/Sidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 6.1.0 — `navLabel` gives the Sidebar a navigation landmark.
 *
 * Sidebar renders an `<aside>` (a complementary landmark) and its items were
 * in no `<nav>`, so a screen reader's landmark list showed no navigation at
 * all. `navLabel` wraps the children in `<nav aria-label>`. Opt-in, because
 * an extra element between the `<aside>` and its children changes the DOM a
 * consumer's CSS or tests may depend on; without it the markup is
 * byte-identical (see sidebar-default-markup.test.tsx).
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("navLabel", () => {
  it("wraps the items in a labelled <nav> inside the <aside>", () => {
    mount(
      <Sidebar navLabel="Main">
        <Sidebar.Item>Home</Sidebar.Item>
        <Sidebar.Item>Inbox</Sidebar.Item>
      </Sidebar>,
    );
    const aside = document.querySelector("aside[data-react-fancy-sidebar]")!;
    const nav = aside.querySelector(":scope > nav") as HTMLElement;
    expect(nav).not.toBeNull();
    expect(nav.getAttribute("aria-label")).toBe("Main");
    expect(nav.hasAttribute("data-react-fancy-sidebar-nav")).toBe(true);
    expect(nav.querySelectorAll("[data-react-fancy-sidebar-item]").length).toBe(2);
  });

  it("keeps the column layout on the <nav>, so the items still stack with their gap", () => {
    mount(<Sidebar navLabel="Main"><Sidebar.Item>Home</Sidebar.Item></Sidebar>);
    const cls = document.querySelector("nav")!.className.split(/\s+/);
    expect(cls).toEqual(expect.arrayContaining(["flex", "flex-col", "gap-0.5", "flex-1", "min-h-0"]));
  });

  it("without it there is no <nav>", () => {
    mount(<Sidebar><Sidebar.Item>Home</Sidebar.Item></Sidebar>);
    expect(document.querySelector("nav")).toBeNull();
  });

  it("an empty navLabel renders no unlabelled <nav>", () => {
    mount(<Sidebar navLabel=""><Sidebar.Item>Home</Sidebar.Item></Sidebar>);
    expect(document.querySelector("nav")).toBeNull();
  });

  it("navLabel={undefined} is byte-identical to omitting it", () => {
    const a = renderToStaticMarkup(<Sidebar><Sidebar.Item>Home</Sidebar.Item></Sidebar>);
    const b = renderToStaticMarkup(
      <Sidebar navLabel={undefined}><Sidebar.Item>Home</Sidebar.Item></Sidebar>,
    );
    expect(b).toBe(a);
  });
});

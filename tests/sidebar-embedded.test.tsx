// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "../src/components/Sidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `Sidebar` embedded inside a container that owns its own chrome.
 *
 * The component was written for the app-shell rail it is usually used as, and
 * hardcoded three things for that job: a right border, an opaque background,
 * and a fixed `w-60`.
 *
 * Dropped into a 300px card — which is what the classroom CoursePlayer does for
 * its lesson list — those combine into a visible defect rather than a stylistic
 * one. The 240px rail draws its right border 240px into a 300px card, so the
 * border reads as a stray vertical line slicing the panel, and the opaque
 * background sits as a lighter block against the card behind it.
 *
 * `embedded` is the opt-out. Not a `className` override: neutralising
 * `border-r`, `bg-white`, `dark:bg-zinc-900` and `w-60` from outside takes four
 * `!important` utilities that every embedding host has to rediscover, and they
 * silently rot the moment the base classes change.
 */
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { unmount: () => act(() => root.unmount()) };
}

const rail = () => document.querySelector("[data-react-fancy-sidebar]")!;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the default rail is unchanged", () => {
  it("keeps its border, background and fixed width", () => {
    const { unmount } = mount(<Sidebar><Sidebar.Item>Home</Sidebar.Item></Sidebar>);
    const cls = rail().className;

    expect(cls).toContain("border-r");
    expect(cls).toContain("bg-white");
    expect(cls).toContain("w-60");
    expect(rail().getAttribute("data-embedded")).toBeNull();
    unmount();
  });
});

describe("embedded", () => {
  it("drops the border, the background and the fixed width", () => {
    const { unmount } = mount(
      <Sidebar embedded><Sidebar.Item>Home</Sidebar.Item></Sidebar>,
    );
    const cls = rail().className;

    // The line the host sees slicing their card.
    expect(cls).not.toContain("border-r");
    // The opaque block sitting on top of the card's own surface.
    expect(cls).not.toContain("bg-white");
    expect(cls).not.toContain("dark:bg-zinc-900");
    // The 240px rail inside a container of some other width.
    expect(cls).not.toContain("w-60");
    expect(cls).toContain("w-full");
    unmount();
  });

  it("exposes a handle so a host can style or target it", () => {
    const { unmount } = mount(<Sidebar embedded><Sidebar.Item>Home</Sidebar.Item></Sidebar>);
    // "true", matching how the neighbouring `data-collapsed` flag renders —
    // React stringifies a boolean data attribute rather than emitting it bare.
    expect(rail().getAttribute("data-embedded")).toBe("true");
    unmount();
  });

  it("still collapses to the icon rail when asked", () => {
    // `embedded` is about chrome, not behaviour — collapsing has to keep
    // working, and a collapsed rail needs its fixed narrow width back.
    const { unmount } = mount(
      <Sidebar embedded collapsed><Sidebar.Item>Home</Sidebar.Item></Sidebar>,
    );
    const cls = rail().className;

    expect(cls).toContain("w-16");
    expect(cls).not.toContain("w-full");
    expect(rail().getAttribute("data-collapsed")).toBe("true");
    unmount();
  });

  it("still lets a className win", () => {
    const { unmount } = mount(
      <Sidebar embedded className="bg-red-50"><Sidebar.Item>Home</Sidebar.Item></Sidebar>,
    );
    expect(rail().className).toContain("bg-red-50");
    unmount();
  });
});

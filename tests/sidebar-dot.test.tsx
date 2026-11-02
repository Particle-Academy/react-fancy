// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "../src/components/Sidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 6.1.0 — `Sidebar.Item` `dot` / `dotLabel` / `collapsedBadge`.
 *
 * A collapsed (`icons`) rail rendered only the item's icon, and `badge` only
 * rendered expanded, so a compact rail had no way to carry an attention mark —
 * unread, warning, "needs you". `dot` is a small corner indicator that renders
 * in BOTH modes; `dotLabel` is its screen-reader text, because a coloured dot
 * alone says nothing to a screen reader. `collapsedBadge` opts the existing
 * `badge` into the collapsed rail as a corner overlay.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

const icon = <svg data-icon="" />;
const item = () => document.querySelector("[data-react-fancy-sidebar-item]") as HTMLElement;
const dot = () => document.querySelector("[data-react-fancy-sidebar-dot]") as HTMLElement | null;

/**
 * The accessible name, per accname for a button / link with no aria-label:
 * text content, falling back to `title` only when the content is empty.
 * jsdom has no accessibility tree, so this is computed the way a browser would.
 */
function accessibleName(el: HTMLElement): string {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[aria-hidden='true']").forEach((n) => n.remove());
  const text = (copy.textContent ?? "").replace(/\s+/g, " ").trim();
  return text || el.getAttribute("title") || "";
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("dot", () => {
  it("renders expanded", () => {
    mount(<Sidebar><Sidebar.Item icon={icon} dot>Inbox</Sidebar.Item></Sidebar>);
    expect(dot()).not.toBeNull();
    expect(item().contains(dot())).toBe(true);
  });

  it("renders collapsed (icons)", () => {
    mount(<Sidebar collapsed><Sidebar.Item icon={icon} dot>Inbox</Sidebar.Item></Sidebar>);
    expect(dot()).not.toBeNull();
  });

  it("renders collapsed (letters) and with no icon", () => {
    mount(<Sidebar collapsed collapseMode="letters"><Sidebar.Item dot>Inbox</Sidebar.Item></Sidebar>);
    expect(dot()).not.toBeNull();
  });

  it("renders expanded with no icon", () => {
    mount(<Sidebar><Sidebar.Item dot>Inbox</Sidebar.Item></Sidebar>);
    expect(dot()).not.toBeNull();
  });

  it("is corner-positioned, not inline", () => {
    mount(<Sidebar collapsed><Sidebar.Item icon={icon} dot>Inbox</Sidebar.Item></Sidebar>);
    expect(dot()!.className).toContain("absolute");
    expect(dot()!.parentElement!.className).toContain("relative");
  });

  it("is hidden from assistive tech (the label carries the meaning)", () => {
    mount(<Sidebar><Sidebar.Item icon={icon} dot>Inbox</Sidebar.Item></Sidebar>);
    expect(dot()!.getAttribute("aria-hidden")).toBe("true");
  });

  it("dot={true} uses the default red", () => {
    mount(<Sidebar><Sidebar.Item dot>Inbox</Sidebar.Item></Sidebar>);
    expect(dot()!.className).toContain("bg-red-500");
    expect(dot()!.getAttribute("data-color")).toBe("red");
  });

  it("takes a Badge colour", () => {
    mount(<Sidebar><Sidebar.Item dot="amber">Inbox</Sidebar.Item></Sidebar>);
    expect(dot()!.className).toContain("bg-amber-500");
    expect(dot()!.getAttribute("data-color")).toBe("amber");
  });

  it("dot={false} renders nothing", () => {
    mount(<Sidebar><Sidebar.Item dot={false} dotLabel="3 unread">Inbox</Sidebar.Item></Sidebar>);
    expect(dot()).toBeNull();
    expect(item().textContent).toBe("Inbox");
  });
});

describe("dotLabel", () => {
  it("is in the accessible text, expanded", () => {
    mount(<Sidebar><Sidebar.Item icon={icon} dot dotLabel="3 unread">Inbox</Sidebar.Item></Sidebar>);
    expect(accessibleName(item())).toBe("Inbox 3 unread");
    const label = item().querySelector("[data-react-fancy-sidebar-dot-label]")!;
    expect(label.className).toContain("sr-only");
  });

  it("is in the accessible text collapsed, and the item is still named", () => {
    mount(<Sidebar collapsed><Sidebar.Item icon={icon} dot dotLabel="3 unread">Inbox</Sidebar.Item></Sidebar>);
    // Without a visually hidden label, the dot label would BECOME the name
    // ("3 unread"), because content beats `title` in accname.
    expect(accessibleName(item())).toBe("Inbox 3 unread");
    expect(item().getAttribute("title")).toBe("Inbox");
  });

  it("collapsed letters mode: the abbreviation does not pollute the name", () => {
    mount(
      <Sidebar collapsed collapseMode="letters">
        <Sidebar.Item dot dotLabel="needs you">Inbox</Sidebar.Item>
      </Sidebar>,
    );
    expect(accessibleName(item())).toBe("Inbox needs you");
  });
});

describe("collapsedBadge", () => {
  it("collapsed without it: the badge stays hidden, as in 6.0.0", () => {
    mount(<Sidebar collapsed><Sidebar.Item icon={icon} badge={<span>12</span>}>Inbox</Sidebar.Item></Sidebar>);
    expect(item().textContent).not.toContain("12");
    expect(item().querySelector("[data-react-fancy-sidebar-badge]")).toBeNull();
  });

  it("collapsed with it: the badge renders at the icon corner", () => {
    mount(
      <Sidebar collapsed>
        <Sidebar.Item icon={icon} badge={<span>12</span>} collapsedBadge>Inbox</Sidebar.Item>
      </Sidebar>,
    );
    const badge = item().querySelector("[data-react-fancy-sidebar-badge]") as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("12");
    expect(badge.className).toContain("absolute");
    // and the count does not replace the item's name
    expect(accessibleName(item())).toBe("Inbox 12");
  });

  it("expanded: unchanged, the badge stays inline and trailing", () => {
    mount(
      <Sidebar>
        <Sidebar.Item icon={icon} badge={<span>12</span>} collapsedBadge>Inbox</Sidebar.Item>
      </Sidebar>,
    );
    const badge = item().querySelector("[data-react-fancy-sidebar-badge]") as HTMLElement | null;
    expect(badge).toBeNull();
    expect(item().lastElementChild!.textContent).toBe("12");
  });

  it("with a dot as well, both render and do not share a corner", () => {
    mount(
      <Sidebar collapsed>
        <Sidebar.Item icon={icon} badge={<span>12</span>} collapsedBadge dot>Inbox</Sidebar.Item>
      </Sidebar>,
    );
    expect(dot()).not.toBeNull();
    expect(dot()!.getAttribute("data-position")).toBe("bottom");
  });
});

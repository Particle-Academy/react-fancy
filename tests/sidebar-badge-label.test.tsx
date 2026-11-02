// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "../src/components/Sidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 6.2.0 — `Sidebar.Item` `badgeLabel`, and a separator between the label and
 * the badge.
 *
 * Expanded, the label and the badge were adjacent elements with nothing
 * between them, so their text ran together in the accessible name: "tynn2".
 * Without `badgeLabel` a visually hidden space now separates them ("tynn 2").
 * With it, the visible badge is hidden from assistive tech and the label is
 * read instead, after a comma ("tynn, 2 agents").
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return host;
}

const icon = <svg data-icon="" />;
const item = () => document.querySelector("[data-react-fancy-sidebar-item]") as HTMLElement;

/** Same approximation as sidebar-dot.test.tsx: content first, `title` as fallback. */
function accessibleName(el: HTMLElement): string {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("[aria-hidden='true']").forEach((n) => n.remove());
  const text = (copy.textContent ?? "").replace(/\s+/g, " ").trim();
  return text || el.getAttribute("title") || "";
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("expanded, without badgeLabel", () => {
  it("the label and the badge are separated in the name", () => {
    mount(<Sidebar><Sidebar.Item icon={icon} badge={<span>2</span>}>tynn</Sidebar.Item></Sidebar>);
    expect(accessibleName(item())).toBe("tynn 2");
  });

  it("the separator is visually hidden, and the badge stays last", () => {
    mount(<Sidebar><Sidebar.Item icon={icon} badge={<span>2</span>}>tynn</Sidebar.Item></Sidebar>);
    const sep = item().lastElementChild!.previousElementSibling as HTMLElement;
    expect(sep.className).toBe("sr-only");
    expect(sep.textContent).toBe(" ");
    expect(item().lastElementChild!.textContent).toBe("2");
  });

  it("an item with no badge renders no separator", () => {
    const html = renderToStaticMarkup(<Sidebar><Sidebar.Item icon={icon}>tynn</Sidebar.Item></Sidebar>);
    expect(html).not.toContain("sr-only");
  });
});

describe("expanded, with badgeLabel", () => {
  it("reads the label instead of the badge, after a comma", () => {
    mount(
      <Sidebar>
        <Sidebar.Item icon={icon} badge={<span>2</span>} badgeLabel="2 agents">tynn</Sidebar.Item>
      </Sidebar>,
    );
    expect(accessibleName(item())).toBe("tynn, 2 agents");
    const label = item().querySelector("[data-react-fancy-sidebar-badge-label]") as HTMLElement;
    expect(label.className).toContain("sr-only");
    expect(item().lastElementChild!.getAttribute("aria-hidden")).toBe("true");
    expect(item().lastElementChild!.textContent).toBe("2");
  });

  it("composes with a dot label", () => {
    mount(
      <Sidebar>
        <Sidebar.Item icon={icon} dot dotLabel="needs you" badge={<span>2</span>} badgeLabel="2 agents">
          tynn
        </Sidebar.Item>
      </Sidebar>,
    );
    expect(accessibleName(item())).toBe("tynn needs you, 2 agents");
  });

  it("is ignored without a badge", () => {
    mount(<Sidebar><Sidebar.Item icon={icon} badgeLabel="2 agents">tynn</Sidebar.Item></Sidebar>);
    expect(accessibleName(item())).toBe("tynn");
    expect(item().querySelector("[data-react-fancy-sidebar-badge-label]")).toBeNull();
  });
});

describe("collapsed", () => {
  it("collapsedBadge without badgeLabel: named by the label, then the count", () => {
    mount(
      <Sidebar collapsed>
        <Sidebar.Item icon={icon} badge={<span>2</span>} collapsedBadge>tynn</Sidebar.Item>
      </Sidebar>,
    );
    expect(accessibleName(item())).toBe("tynn 2");
  });

  it("collapsedBadge with badgeLabel: the overlay is hidden and the label read", () => {
    mount(
      <Sidebar collapsed>
        <Sidebar.Item icon={icon} badge={<span>2</span>} collapsedBadge badgeLabel="2 agents">
          tynn
        </Sidebar.Item>
      </Sidebar>,
    );
    expect(accessibleName(item())).toBe("tynn, 2 agents");
    const overlay = item().querySelector("[data-react-fancy-sidebar-badge]") as HTMLElement;
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(overlay.textContent).toBe("2");
  });

  it("collapsedBadge, badgeLabel and a dot label", () => {
    mount(
      <Sidebar collapsed>
        <Sidebar.Item icon={icon} dot dotLabel="needs you" badge={<span>2</span>} collapsedBadge badgeLabel="2 agents">
          tynn
        </Sidebar.Item>
      </Sidebar>,
    );
    expect(accessibleName(item())).toBe("tynn needs you, 2 agents");
  });

  it("letters mode with collapsedBadge and badgeLabel", () => {
    mount(
      <Sidebar collapsed collapseMode="letters">
        <Sidebar.Item badge={<span>2</span>} collapsedBadge badgeLabel="2 agents">tynn</Sidebar.Item>
      </Sidebar>,
    );
    expect(accessibleName(item())).toBe("tynn, 2 agents");
  });

  it("badgeLabel without collapsedBadge: no badge shown, so nothing is read", () => {
    mount(
      <Sidebar collapsed>
        <Sidebar.Item icon={icon} badge={<span>2</span>} badgeLabel="2 agents">tynn</Sidebar.Item>
      </Sidebar>,
    );
    expect(item().querySelector("[data-react-fancy-sidebar-badge-label]")).toBeNull();
    expect(item().textContent).toBe("");
    expect(accessibleName(item())).toBe("tynn");
  });
});

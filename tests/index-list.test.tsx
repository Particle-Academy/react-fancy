// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { IndexList } from "../src/components/IndexList/IndexList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

const ITEMS = [
  { num: "01", title: "Meridian", meta: "Brand system", value: "2024", href: "/work/meridian" },
  { num: "02", title: "Halcyon", meta: "Editorial", value: "2023", href: "/work/halcyon" },
  { num: "03", title: "Unlinked", meta: "Internal", value: "2022" },
];

describe("IndexList", () => {
  it("renders every part of a row", () => {
    const { host, unmount } = mount(<IndexList items={ITEMS} />);
    const row = host.querySelectorAll("[data-react-fancy-index-row]")[0];

    expect(row.textContent).toBe("01MeridianBrand system2024");
    unmount();
  });

  it("renders EXACTLY ONE anchor per row", () => {
    // Issue #418. Nested anchors are silently restructured by the browser, so
    // the server HTML and the client tree disagree and hydration blows up. The
    // whole-row click target is the title anchor's after:inset-0 pseudo-element
    // rather than a wrapping <a>, precisely so this stays true.
    const { host, unmount } = mount(<IndexList items={ITEMS} />);

    for (const row of host.querySelectorAll("[data-react-fancy-index-row]")) {
      expect(row.querySelectorAll("a").length, `row "${row.textContent}"`).toBeLessThanOrEqual(1);
    }

    expect(host.querySelectorAll("a")).toHaveLength(2); // the third item has no href
    unmount();
  });

  it("stretches the anchor over the row instead of wrapping it", () => {
    const { host, unmount } = mount(<IndexList items={ITEMS} />);
    const a = host.querySelector("a") as HTMLAnchorElement;
    const row = host.querySelector("[data-react-fancy-index-row]") as HTMLElement;

    expect(a.className).toContain("after:absolute");
    expect(a.className).toContain("after:inset-0");
    expect(row.className, "the row must establish the positioning context").toContain("relative");
    unmount();
  });

  it("keeps the title as the link text", () => {
    // Not an aria-label on an invisible overlay: the accessible name should be
    // the thing you would say out loud.
    const { host, unmount } = mount(<IndexList items={ITEMS} />);
    const a = host.querySelector("a") as HTMLAnchorElement;

    expect(a.textContent).toBe("Meridian");
    expect(a.getAttribute("href")).toBe("/work/meridian");
    unmount();
  });

  it("renders a row with no href as plain text", () => {
    const { host, unmount } = mount(<IndexList items={[ITEMS[2]!]} />);

    expect(host.querySelector("a")).toBeNull();
    expect(host.textContent).toContain("Unlinked");
    unmount();
  });

  it("takes a router link component", () => {
    // So Inertia / next/link keep client-side navigation instead of a full page
    // load — the reason a hardcoded <a> would not do.
    const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
      <a href={href} data-router-link="" {...rest}>
        {children}
      </a>
    );
    const { host, unmount } = mount(<IndexList items={ITEMS} linkAs={Link} />);

    expect(host.querySelectorAll("[data-router-link]")).toHaveLength(2);
    unmount();
  });

  it("aligns the marker and trailing columns with tabular figures", () => {
    const { host, unmount } = mount(<IndexList items={ITEMS} />);
    const row = host.querySelector("[data-react-fancy-index-row]") as HTMLElement;
    const tabular = [...row.querySelectorAll("span")].filter((s) => s.className.includes("tabular-nums"));

    expect(tabular.length, "num and value should both be tabular").toBe(2);
    unmount();
  });

  it("is an ordered list, because it is one", () => {
    const { host, unmount } = mount(<IndexList items={ITEMS} />);

    expect((host.firstElementChild as HTMLElement).tagName).toBe("OL");
    expect(host.querySelectorAll("li")).toHaveLength(3);
    unmount();
  });
});

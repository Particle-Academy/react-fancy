// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, forwardRef, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { NotificationInbox, formatRelativeTime, type NotificationItem } from "../src";
import { expectContrast, fg, surface } from "./contrast-assert";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * NotificationInbox (CC-fancy-0033): a controlled list of notifications.
 * Data in (`items`), events out (`onMarkRead(id)`, `onMarkAllRead()`,
 * `onAction(id)`); it never changes an item's read state itself.
 */

let roots: Root[] = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  roots.push(root);
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
  document.body.innerHTML = "";
});

const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
const ITEMS: NotificationItem[] = [
  { id: "n1", title: "Build passed", body: "main is green", time: NOW - 5 * 60_000, read: false, href: "/builds/1", actionLabel: "Open build" },
  { id: "n2", title: "Invoice paid", time: new Date(NOW - 2 * 86_400_000).toISOString(), read: true, href: "/billing" },
  { id: "n3", title: "مرحبا", body: "رسالة جديدة", time: NOW - 30_000, read: false },
];

const item = (host: ParentNode, id: string) =>
  host.querySelector<HTMLElement>(`[data-react-fancy-notification-inbox-item="${id}"]`)!;

describe("NotificationInbox: rendering", () => {
  it("renders every item with a stable handle and its read state", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} />);
    const root = host.querySelector("[data-react-fancy-notification-inbox]")!;
    expect(root).not.toBeNull();
    expect(root.querySelectorAll("[data-react-fancy-notification-inbox-item]").length).toBe(3);
    expect(item(host, "n1").getAttribute("data-read")).toBe("false");
    expect(item(host, "n2").getAttribute("data-read")).toBe("true");
  });

  it("is a labelled region whose list is a list", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} />);
    const root = host.querySelector("[data-react-fancy-notification-inbox]")!;
    const heading = root.querySelector("h2")!;
    expect(heading.textContent).toBe("Notifications");
    expect(root.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(root.querySelector("ul")).not.toBeNull();
    expect(root.querySelectorAll("ul > li").length).toBe(3);
  });

  it("says read or unread in words, not colour alone", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} />);
    const state = (id: string) => item(host, id).querySelector("[data-react-fancy-notification-inbox-state]")!;
    expect(state("n1").textContent).toBe("Unread");
    expect(state("n2").textContent).toBe("Read");
  });

  it("counts the unread in the header", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} />);
    expect(host.querySelector("[data-react-fancy-notification-inbox-count]")!.textContent).toBe("2 unread");
  });

  it("puts dir=auto on the title, body and action text", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} />);
    const n3 = item(host, "n3");
    expect(n3.querySelector("[data-react-fancy-notification-inbox-title]")!.getAttribute("dir")).toBe("auto");
    expect(n3.querySelector("[data-react-fancy-notification-inbox-body]")!.getAttribute("dir")).toBe("auto");
    expect(item(host, "n1").querySelector("[data-react-fancy-notification-inbox-action]")!.getAttribute("dir")).toBe("auto");
  });

  it("shows relative time in a <time> with the exact instant", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} />);
    const t1 = item(host, "n1").querySelector("time")!;
    expect(t1.textContent).toBe("5 minutes ago");
    expect(t1.getAttribute("dateTime")).toBe(new Date(NOW - 5 * 60_000).toISOString());
    expect(item(host, "n2").querySelector("time")!.textContent).toBe("2 days ago");
    expect(item(host, "n3").querySelector("time")!.textContent).toBe("now");
  });

  it("formats relative time in the given locale", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} locale="es" />);
    expect(item(host, "n1").querySelector("time")!.textContent).toBe("hace 5 minutos");
  });

  it("an empty inbox says so", () => {
    const { host } = mount(<NotificationInbox items={[]} now={NOW} />);
    const empty = host.querySelector("[data-react-fancy-notification-inbox-empty]")!;
    expect(empty.textContent).toBe("No notifications");
    expect(host.querySelector("ul")).toBeNull();
    expect(host.querySelector("[data-react-fancy-notification-inbox-mark-all-read]")).toBeNull();
  });
});

describe("NotificationInbox: actions are events out", () => {
  it("each item's action link goes to its href, with its own label or the default", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} />);
    const a1 = item(host, "n1").querySelector<HTMLAnchorElement>("[data-react-fancy-notification-inbox-action]")!;
    expect(a1.tagName).toBe("A");
    expect(a1.getAttribute("href")).toBe("/builds/1");
    expect(a1.textContent).toBe("Open build");
    const a2 = item(host, "n2").querySelector("[data-react-fancy-notification-inbox-action]")!;
    expect(a2.textContent).toBe("View");
    expect(item(host, "n3").querySelector("[data-react-fancy-notification-inbox-action]"), "no href, no link").toBeNull();
  });

  it("renders the action through linkComponent (an Inertia Link, say)", () => {
    const seen: string[] = [];
    const Link = forwardRef<HTMLAnchorElement, { href: string; children?: ReactNode }>(function Link(
      { href, children, ...rest },
      ref,
    ) {
      seen.push(href);
      return (
        <a ref={ref} href={href} data-custom-link="" {...rest}>
          {children}
        </a>
      );
    });
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} linkComponent={Link} />);
    const a = item(host, "n1").querySelector("[data-react-fancy-notification-inbox-action]")!;
    expect(a.hasAttribute("data-custom-link")).toBe(true);
    expect(seen).toContain("/builds/1");
  });

  it("onAction(id) fires when an action link is followed", () => {
    const onAction = vi.fn();
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} onAction={onAction} />);
    const a = item(host, "n1").querySelector<HTMLAnchorElement>("[data-react-fancy-notification-inbox-action]")!;
    a.addEventListener("click", (e) => e.preventDefault());
    act(() => a.click());
    expect(onAction).toHaveBeenCalledWith("n1");
  });

  it("onMarkRead(id) from an unread item's button; read items have none", () => {
    const onMarkRead = vi.fn();
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} onMarkRead={onMarkRead} />);
    const btn = item(host, "n1").querySelector<HTMLButtonElement>("[data-react-fancy-notification-inbox-mark-read]")!;
    expect(btn.textContent).toBe("Mark as read");
    expect(btn.getAttribute("aria-label")).toBe("Mark as read: Build passed");
    act(() => btn.click());
    expect(onMarkRead).toHaveBeenCalledWith("n1");
    expect(item(host, "n2").querySelector("[data-react-fancy-notification-inbox-mark-read]")).toBeNull();
  });

  it("is controlled: marking read changes nothing until the items say so", () => {
    const onMarkRead = vi.fn();
    const { host, rerender } = mount(<NotificationInbox items={ITEMS} now={NOW} onMarkRead={onMarkRead} />);
    act(() => item(host, "n1").querySelector<HTMLButtonElement>("[data-react-fancy-notification-inbox-mark-read]")!.click());
    expect(item(host, "n1").getAttribute("data-read")).toBe("false");
    rerender(
      <NotificationInbox
        items={ITEMS.map((i) => (i.id === "n1" ? { ...i, read: true } : i))}
        now={NOW}
        onMarkRead={onMarkRead}
      />,
    );
    expect(item(host, "n1").getAttribute("data-read")).toBe("true");
  });

  it("onMarkAllRead() from the header, shown only while something is unread", () => {
    const onMarkAllRead = vi.fn();
    const { host, rerender } = mount(<NotificationInbox items={ITEMS} now={NOW} onMarkAllRead={onMarkAllRead} />);
    const btn = host.querySelector<HTMLButtonElement>("[data-react-fancy-notification-inbox-mark-all-read]")!;
    expect(btn.textContent).toBe("Mark all as read");
    act(() => btn.click());
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    rerender(
      <NotificationInbox items={ITEMS.map((i) => ({ ...i, read: true }))} now={NOW} onMarkAllRead={onMarkAllRead} />,
    );
    expect(host.querySelector("[data-react-fancy-notification-inbox-mark-all-read]")).toBeNull();
  });
});

describe("NotificationInbox: labels", () => {
  it("every word is overridable", () => {
    const { host } = mount(
      <NotificationInbox
        items={ITEMS}
        now={NOW}
        onMarkRead={() => {}}
        onMarkAllRead={() => {}}
        labels={{
          heading: "Avisos",
          unreadCount: "{count} sin leer",
          unread: "Sin leer",
          read: "Leído",
          markRead: "Marcar como leído",
          markReadNamed: "Marcar como leído: {title}",
          markAllRead: "Marcar todo como leído",
          action: "Ver",
          empty: "Sin avisos",
        }}
      />,
    );
    expect(host.querySelector("h2")!.textContent).toBe("Avisos");
    expect(host.querySelector("[data-react-fancy-notification-inbox-count]")!.textContent).toBe("2 sin leer");
    expect(item(host, "n1").querySelector("[data-react-fancy-notification-inbox-state]")!.textContent).toBe("Sin leer");
    expect(item(host, "n2").querySelector("[data-react-fancy-notification-inbox-state]")!.textContent).toBe("Leído");
    const mark = item(host, "n1").querySelector("[data-react-fancy-notification-inbox-mark-read]")!;
    expect(mark.textContent).toBe("Marcar como leído");
    expect(mark.getAttribute("aria-label")).toBe("Marcar como leído: Build passed");
    expect(host.querySelector("[data-react-fancy-notification-inbox-mark-all-read]")!.textContent).toBe(
      "Marcar todo como leído",
    );
    expect(item(host, "n2").querySelector("[data-react-fancy-notification-inbox-action]")!.textContent).toBe("Ver");

    const empty = mount(<NotificationInbox items={[]} labels={{ empty: "Sin avisos" }} />);
    expect(empty.host.querySelector("[data-react-fancy-notification-inbox-empty]")!.textContent).toBe("Sin avisos");
  });

  it("headingLevel sets the heading element", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} headingLevel={3} />);
    expect(host.querySelector("h3")!.textContent).toBe("Notifications");
    expect(host.querySelector("h2")).toBeNull();
  });
});

describe("NotificationInbox: WCAG AAA (7:1) text, through the theme tokens", () => {
  it("title, body, time, state word, count, action link and empty state", () => {
    const { host } = mount(
      <NotificationInbox items={ITEMS} now={NOW} onMarkRead={() => {}} onMarkAllRead={() => {}} />,
    );
    const n1 = item(host, "n1");
    const n2 = item(host, "n2");
    const parts: Array<[string, Element | null]> = [
      ["heading", host.querySelector("h2")],
      ["unread count", host.querySelector("[data-react-fancy-notification-inbox-count]")],
      ["title", n1.querySelector("[data-react-fancy-notification-inbox-title]")],
      ["body", n1.querySelector("[data-react-fancy-notification-inbox-body]")],
      ["time", n1.querySelector("time")],
      ["unread word", n1.querySelector("[data-react-fancy-notification-inbox-state]")],
      ["read word", n2.querySelector("[data-react-fancy-notification-inbox-state]")],
      ["action link", n1.querySelector("[data-react-fancy-notification-inbox-action]")],
    ];
    for (const [label, el] of parts) {
      expect(el, label).not.toBeNull();
      expectContrast(label, fg(el), surface(el), 7);
    }
    const empty = mount(<NotificationInbox items={[]} />);
    const e = empty.host.querySelector("[data-react-fancy-notification-inbox-empty]");
    expectContrast("empty state", fg(e), surface(e), 7);
  });

  it("colours come from the --fancy-* tokens, not bare palette classes", () => {
    const { host } = mount(<NotificationInbox items={ITEMS} now={NOW} />);
    const title = item(host, "n1").querySelector("[data-react-fancy-notification-inbox-title]")!;
    expect(title.getAttribute("class")).toContain("var(--fancy-text,");
    const root = host.querySelector("[data-react-fancy-notification-inbox]")!;
    expect(root.getAttribute("class")).toContain("var(--fancy-surface,");
  });
});

describe("formatRelativeTime", () => {
  const now = NOW;
  it.each([
    [now, "now"],
    [now - 30_000, "now"],
    [now - 90_000, "2 minutes ago"],
    [now - 3 * 3_600_000, "3 hours ago"],
    [now - 86_400_000, "yesterday"],
    [now - 3 * 86_400_000, "3 days ago"],
    [now - 14 * 86_400_000, "2 weeks ago"],
    [now - 70 * 86_400_000, "2 months ago"],
    [now - 800 * 86_400_000, "2 years ago"],
    [now + 3_600_000, "in 1 hour"],
  ])("%s", (time, expected) => {
    expect(formatRelativeTime(time, { now, locale: "en" })).toBe(expected);
  });

  it("accepts a Date or an ISO string", () => {
    expect(formatRelativeTime(new Date(now - 5 * 60_000), { now, locale: "en" })).toBe("5 minutes ago");
    expect(formatRelativeTime(new Date(now - 5 * 60_000).toISOString(), { now, locale: "en" })).toBe("5 minutes ago");
  });

  it("an invalid time renders as an empty string, never 'NaN'", () => {
    expect(formatRelativeTime("not a date", { now, locale: "en" })).toBe("");
  });
});

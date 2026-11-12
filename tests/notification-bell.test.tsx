// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createRef, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { NotificationBell, Popover } from "../src";
import { contrast, defaultColourOf } from "./contrast-helper";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * NotificationBell (CC-fancy-0033): an icon button showing an unread count.
 * Controlled: `count` and `open` are data in, `onOpenChange` is the event out.
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

const bell = (host: ParentNode) => host.querySelector<HTMLButtonElement>("[data-react-fancy-notification-bell]")!;
const badge = (host: ParentNode) => host.querySelector("[data-react-fancy-notification-bell-count]");
const status = (host: ParentNode) => host.querySelector("[data-react-fancy-notification-bell-status]")!;

describe("NotificationBell", () => {
  it("is a button named Notifications, with stable handles", () => {
    const { host } = mount(<NotificationBell count={3} />);
    const b = bell(host);
    expect(b.tagName).toBe("BUTTON");
    expect(b.getAttribute("type")).toBe("button");
    expect(b.getAttribute("aria-label")).toBe("Notifications");
    expect(b.getAttribute("data-count")).toBe("3");
    expect(b.getAttribute("data-unread")).toBe("true");
    expect(b.hasAttribute("data-react-fancy-action"), "it is a kit Button, so touch density covers it").toBe(true);
  });

  it("shows the count in a badge hidden from assistive tech, capped at max", () => {
    const { host, rerender } = mount(<NotificationBell count={3} />);
    expect(badge(host)!.textContent).toBe("3");
    expect(badge(host)!.getAttribute("aria-hidden")).toBe("true");
    rerender(<NotificationBell count={250} />);
    expect(badge(host)!.textContent).toBe("99+");
    rerender(<NotificationBell count={12} max={9} />);
    expect(badge(host)!.textContent).toBe("9+");
    rerender(<NotificationBell count={0} />);
    expect(badge(host)).toBeNull();
    expect(bell(host).getAttribute("data-unread")).toBe("false");
  });

  it("announces the count politely, and the button is described by it", () => {
    const { host, rerender } = mount(<NotificationBell count={3} />);
    const s = status(host);
    expect(s.getAttribute("role")).toBe("status");
    expect(s.getAttribute("aria-live")).toBe("polite");
    expect(s.textContent).toBe("3 unread notifications");
    expect(bell(host).getAttribute("aria-describedby")).toBe(s.id);
    expect(bell(host).contains(s), "a live region inside a button is not announced").toBe(false);
    rerender(<NotificationBell count={1} />);
    expect(status(host).textContent).toBe("1 unread notification");
    rerender(<NotificationBell count={0} />);
    expect(status(host).textContent).toBe("No unread notifications");
  });

  it("takes every word from labels", () => {
    const labels = {
      button: "Notificaciones",
      unread: "{count} notificaciones sin leer",
      unreadOne: "1 notificación sin leer",
      none: "Sin notificaciones nuevas",
      overflow: "{max}+",
    };
    const { host, rerender } = mount(<NotificationBell count={4} labels={labels} />);
    expect(bell(host).getAttribute("aria-label")).toBe("Notificaciones");
    expect(status(host).textContent).toBe("4 notificaciones sin leer");
    rerender(<NotificationBell count={1} labels={labels} />);
    expect(status(host).textContent).toBe("1 notificación sin leer");
    rerender(<NotificationBell count={0} labels={labels} />);
    expect(status(host).textContent).toBe("Sin notificaciones nuevas");
  });

  it("is controlled: a click asks for the next open state and does not set it", () => {
    const onOpenChange = vi.fn();
    const { host } = mount(<NotificationBell count={2} open={false} onOpenChange={onOpenChange} />);
    expect(bell(host).getAttribute("aria-expanded")).toBe("false");
    act(() => bell(host).click());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(bell(host).getAttribute("aria-expanded")).toBe("false");
  });

  it("without `open` it sets no aria-expanded and still calls onClick", () => {
    const onClick = vi.fn();
    const { host } = mount(<NotificationBell count={2} onClick={onClick} />);
    expect(bell(host).hasAttribute("aria-expanded")).toBe(false);
    act(() => bell(host).click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards its ref and data-* to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    const { host } = mount(<NotificationBell ref={ref} count={1} data-handle="inbox-bell" />);
    expect(ref.current).toBe(bell(host));
    expect(bell(host).getAttribute("data-handle")).toBe("inbox-bell");
  });

  it("works as a Popover trigger", () => {
    const { host } = mount(
      <Popover>
        <Popover.Trigger>
          <NotificationBell count={2} />
        </Popover.Trigger>
        <Popover.Content>
          <p>Inbox</p>
        </Popover.Content>
      </Popover>,
    );
    const b = bell(host);
    expect(b.getAttribute("aria-haspopup")).toBe("dialog");
    act(() => b.click());
    expect(document.querySelector("[data-react-fancy-popover]")).not.toBeNull();
    expect(b.getAttribute("aria-expanded")).toBe("true");
  });

  it("the badge's number clears WCAG AAA (7:1) in both modes", () => {
    const { host } = mount(<NotificationBell count={5} />);
    const cls = badge(host)!.getAttribute("class")!;
    for (const [fgPrefix, bgPrefix, mode] of [
      ["", "", "light"],
      ["dark:", "dark:", "dark"],
    ] as const) {
      const f = defaultColourOf(cls, fgPrefix) ?? defaultColourOf(cls, "");
      const b = defaultColourOf(cls, bgPrefix, "bg") ?? defaultColourOf(cls, "", "bg");
      expect(f && b, `${mode}: badge colours read from ${cls}`).toBeTruthy();
      const r = contrast(f!, b!);
      expect(r, `${mode}: ${f} on ${b} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(7);
    }
  });
});

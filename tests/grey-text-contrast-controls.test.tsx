// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { Modal } from "../src/components/Modal";
import { Drawer } from "../src/components/Drawer";
import { ToastItem } from "../src/components/Toast/ToastItem";
import type { ToastData } from "../src/components/Toast/Toast.types";
import { MobileMenu } from "../src/components/MobileMenu";
import { Sidebar } from "../src/components/Sidebar";
import { Navbar } from "../src/components/Navbar";
import { Calendar } from "../src/components/Calendar";
import { TimePicker } from "../src/components/TimePicker";
import { Pillbox } from "../src/components/Pillbox/Pillbox";
import { FileBrowser, type FileSnapshotNode } from "../src/components/FileBrowser";
import { Composer } from "../src/components/Composer";
import { Input } from "../src/components/inputs/Input/Input";
import { ChatDrawer } from "../src/components/ChatDrawer";
import { AccordionPanel } from "../src/components/AccordionPanel";
import { Breadcrumbs } from "../src/components/Breadcrumbs";
import { expectControl, expectText, mount, surface, unmountAll } from "./contrast-assert";

/**
 * The glyph of an icon-only control owes 3:1 against what is behind it
 * (WCAG 1.4.11), at rest and on hover. Bare `text-zinc-400` was 2.62:1 on the
 * kit's white surface, so every close, dismiss, toggle and remove button below
 * failed it in light mode. They now rest on the muted token (4.83:1 light,
 * 6.75:1 dark) and hover to soft. Measured for an app that sets no `--fancy-*`
 * variable (6.12.0).
 */

afterEach(() => unmountAll());

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

describe("close and dismiss buttons", () => {
  it("Modal header close", () => {
    mount(
      <Modal open onClose={() => {}}>
        <Modal.Header>Title</Modal.Header>
      </Modal>,
    );
    expectControl("Modal close", q("[data-react-fancy-modal-close]"));
  });

  it("Drawer header close", () => {
    mount(
      <Drawer open onClose={() => {}}>
        <Drawer.Header>Title</Drawer.Header>
      </Drawer>,
    );
    expectControl("Drawer close", q("[data-react-fancy-drawer-close]"));
  });

  it("Toast dismiss", () => {
    mount(<ToastItem data={{ id: "t", title: "Saved" } as ToastData} onDismiss={() => {}} />);
    expectControl("Toast dismiss", q('[data-react-fancy-toast-item] button[aria-label="Dismiss"]'));
  });

  it("MobileMenu flyout close", () => {
    mount(
      <MobileMenu.Flyout open onClose={() => {}}>
        <MobileMenu.Item>Home</MobileMenu.Item>
      </MobileMenu.Flyout>,
    );
    const close = [...document.querySelectorAll("[data-react-fancy-mobile-menu-flyout] button")].find((b) =>
      b.querySelector("svg"),
    );
    expectControl("MobileMenu close", close);
  });

  it("Composer: discard a pasted-text pill", () => {
    const { host } = mount(<Composer pasteThreshold={10} />);
    const ta = host.querySelector("textarea")!;
    const ev = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "clipboardData", { value: { getData: () => "x".repeat(50) } });
    act(() => {
      ta.dispatchEvent(ev);
    });
    const remove = host.querySelector("[data-react-fancy-composer-paste-pill-remove]");
    expect(remove).not.toBeNull();
    // The × sits over the pill's right edge, not on the composer: the pill is
    // zinc-50 (zinc-100 on hover) and zinc-800 in dark. Measure the darker.
    expectControl("Composer discard", remove, { light: "zinc-100", dark: "zinc-800" });
  });
});

describe("toggles", () => {
  it("Sidebar collapse toggle", () => {
    mount(
      <Sidebar>
        <Sidebar.Toggle />
      </Sidebar>,
    );
    expectControl("Sidebar toggle", q("[data-react-fancy-sidebar-toggle]"));
  });

  it("Navbar mobile toggle", () => {
    mount(
      <Navbar>
        <Navbar.Toggle />
        <Navbar.Item>Home</Navbar.Item>
      </Navbar>,
    );
    expectControl("Navbar toggle", q("[data-react-fancy-navbar-toggle]"));
  });

  it("ChatDrawer collapse toggle, and the numbered chip on its border-tone fill", () => {
    const { host } = mount(
      <ChatDrawer tabs={[{ id: "a", label: "Chat" }, { id: "b", label: "Notes" }]} activeTabId="a" onTabChange={() => {}} />,
    );
    expectControl("ChatDrawer toggle", host.querySelector('button[aria-label$="drawer"]'));
    const chip = [...host.querySelectorAll("span")].find((s) => s.textContent === "2");
    expectText("ChatDrawer inactive tab number", chip);
  });

  it("Input password reveal", () => {
    const { host } = mount(<Input type="password" reveal defaultValue="x" />);
    const b = host.querySelector("[data-react-fancy-reveal]");
    expectControl("Input reveal", b, surface(host.querySelector("input")));
  });

  it("AccordionPanel trigger", () => {
    const { host } = mount(
      <AccordionPanel defaultValue={["a"]}>
        <AccordionPanel.Section id="a">
          <AccordionPanel.Trigger />
          <AccordionPanel.Content>x</AccordionPanel.Content>
        </AccordionPanel.Section>
      </AccordionPanel>,
    );
    const trigger = host.querySelector('[data-react-fancy-accordion-trigger][data-state="open"]');
    expectControl("AccordionPanel trigger", trigger);
  });
});

describe("steppers and removers", () => {
  it("Calendar previous / next month", () => {
    const { host } = mount(<Calendar visibleMonth={new Date(2026, 9, 1)} />);
    expectControl("Calendar previous", host.querySelector('button[aria-label="Previous month"]'));
    expectControl("Calendar next", host.querySelector('button[aria-label="Next month"]'));
  });

  it("TimePicker spin buttons", () => {
    const { host } = mount(<TimePicker defaultValue="09:30" />);
    const spins = [...host.querySelectorAll("button")].filter((b) => b.getAttribute("class")?.includes("h-7"));
    expect(spins.length).toBeGreaterThan(0);
    for (const s of spins) expectControl("TimePicker spin", s);
  });

  it("Pillbox remove (on the pill's zinc-100 / zinc-800 fill)", () => {
    const { host } = mount(<Pillbox defaultValue={["alpha"]} />);
    expectControl("Pillbox remove", host.querySelector('button[aria-label="Remove alpha"]'));
  });

  it("Breadcrumbs: the collapsed '...' expander", () => {
    const { host } = mount(
      <Breadcrumbs shrink>
        <Breadcrumbs.Item href="#">a</Breadcrumbs.Item>
        <Breadcrumbs.Item href="#">b</Breadcrumbs.Item>
        <Breadcrumbs.Item href="#">c</Breadcrumbs.Item>
        <Breadcrumbs.Item active>d</Breadcrumbs.Item>
      </Breadcrumbs>,
    );
    const more = [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === "...");
    expect(more).toBeTruthy();
    // It is text, so it owes AA, not just 3:1.
    expectText("Breadcrumbs expander", more);
    expectText("Breadcrumbs expander, hover", more, undefined, "hover");
    const sep = host.querySelector("[data-react-fancy-breadcrumbs] svg");
    expect(sep?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("FileBrowser chrome", () => {
  const SNAPSHOT: FileSnapshotNode[] = [
    {
      path: "/src",
      name: "src",
      kind: "directory",
      children: [
        { path: "/src/index.ts", name: "index.ts", kind: "file" },
        { path: "/src/lib", name: "lib", kind: "directory", children: [] },
      ],
    },
  ];

  it("edit-path, clear-filter and the row chevron", () => {
    const { host } = mount(<FileBrowser snapshot={SNAPSHOT} defaultPath="/src" defaultFilter="i" onCreateFolder={vi.fn()} />);
    expectControl("FileBrowser edit path", host.querySelector('button[aria-label="Edit path"]'));
    expectControl("FileBrowser clear filter", host.querySelector('button[aria-label="Clear filter"]'));
    const filterIcon = host.querySelector("[data-react-fancy-file-browser-filter] svg");
    expect(filterIcon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("the New folder button and its Cancel are readable text", () => {
    const { host } = mount(<FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={vi.fn()} />);
    const btn = host.querySelector("[data-react-fancy-file-browser-new-folder]");
    expectText("New folder button", btn);
    act(() => {
      btn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expectText("New folder cancel", host.querySelector("[data-react-fancy-file-browser-new-folder-cancel]"));
  });
});

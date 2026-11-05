// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useRef, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { inlineStep, directionOf } from "../src/utils/direction";
import { useFloatingPosition } from "../src/hooks/use-floating-position";
import { Tabs } from "../src/components/Tabs";
import { OtpInput } from "../src/components/OtpInput";
import { Stepper } from "../src/components/Stepper";
import { ResizablePanels } from "../src/components/ResizablePanels";
import { ToastStack } from "../src/components/Toast/ToastStack";
import { Toast } from "../src/components/Toast";
import { TimeGrid } from "../src/components/TimeGrid";
import { ReorderableGrid } from "../src/components/ReorderableGrid";
import { Drawer } from "../src/components/Drawer";
import { MobileMenu } from "../src/components/MobileMenu";
import { ContextMenu } from "../src/components/ContextMenu";
import { Switch } from "../src/components/inputs/Switch";
import { MultiSwitch } from "../src/components/inputs/MultiSwitch";
import { Carousel } from "../src/components/Carousel";
import { CodeBlock } from "../src/components/CodeBlock";
import { CodeView } from "../src/components/CodeView";
import { Breadcrumbs } from "../src/components/Breadcrumbs";
import { Pagination } from "../src/components/Pagination";
import { StatList } from "../src/components/StatList";
import { Sidebar } from "../src/components/Sidebar";
import { AccordionPanel } from "../src/components/AccordionPanel";
import { InputTag, type InputTagAdapter, type InputTagAdapterState } from "../src/components/InputTag";

/**
 * Right-to-left behaviour that jsdom CAN express: key handling, the side a
 * computed position lands on, and the markup that mirrors. jsdom resolves the
 * CSS `direction` from a `dir` ancestor, which is all these need. Geometry it
 * cannot express (does the leading icon actually land on the right?) is
 * checked in a real browser; see the 6.9.0 changelog entry.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];
function mount(el: ReactElement, dir: "ltr" | "rtl" = "rtl") {
  const host = document.createElement("div");
  host.setAttribute("dir", dir);
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(el));
  return host;
}
afterEach(() => {
  for (const r of roots.splice(0)) act(() => r.unmount());
  document.body.innerHTML = "";
});

function key(el: Element, k: string, init: KeyboardEventInit = {}) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
  });
}
function rect(el: Element, r: { left: number; top: number; width: number; height: number }) {
  const box = { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON() {} };
  (el as HTMLElement).getBoundingClientRect = () => box as DOMRect;
}

describe("direction utility", () => {
  it("reads the resolved direction from the nearest dir ancestor", () => {
    const host = mount(<span id="probe">x</span>);
    expect(directionOf(host.querySelector("#probe"))).toBe("rtl");
    expect(directionOf(null)).toBe("ltr");
  });

  it("maps a visual arrow to a logical step", () => {
    const rtl = mount(<span id="r" />, "rtl").querySelector("#r");
    const ltr = mount(<span id="l" />, "ltr").querySelector("#l");
    expect([inlineStep("ArrowRight", ltr), inlineStep("ArrowLeft", ltr)]).toEqual([1, -1]);
    expect([inlineStep("ArrowRight", rtl), inlineStep("ArrowLeft", rtl)]).toEqual([-1, 1]);
    expect(inlineStep("ArrowDown", rtl)).toBe(0);
  });
});

describe("arrow keys follow the visual direction in RTL", () => {
  it("Tabs: ArrowLeft selects the NEXT tab, which sits to the left", () => {
    const host = mount(
      <Tabs defaultTab="a">
        <Tabs.List>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
          <Tabs.Tab value="c">C</Tabs.Tab>
        </Tabs.List>
      </Tabs>,
    );
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    act(() => tabs[1].focus());
    key(tabs[1], "ArrowLeft");
    expect(document.activeElement).toBe(tabs[2]);
    key(tabs[2], "ArrowRight");
    expect(document.activeElement).toBe(tabs[1]);
  });

  it("Tabs: LTR is unchanged", () => {
    const host = mount(
      <Tabs defaultTab="a">
        <Tabs.List>
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs.List>
      </Tabs>,
      "ltr",
    );
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    act(() => tabs[0].focus());
    key(tabs[0], "ArrowRight");
    expect(document.activeElement).toBe(tabs[1]);
  });

  it("Stepper (horizontal, clickable): ArrowLeft focuses the next step", () => {
    const host = mount(
      <Stepper
        aria-label="Steps"
        clickable
        orientation="horizontal"
        steps={[{ id: "a", title: "A" }, { id: "b", title: "B" }, { id: "c", title: "C" }]}
      />,
    );
    const triggers = [...host.querySelectorAll<HTMLButtonElement>("[data-react-fancy-stepper-trigger]")];
    act(() => triggers[1].focus());
    key(triggers[1], "ArrowLeft");
    expect(document.activeElement).toBe(triggers[2]);
  });

  it("ResizablePanels: ArrowLeft grows the first panel, which sits on the right", () => {
    function Host() {
      const [v, setV] = useState(30);
      return (
        <ResizablePanels value={v} onValueChange={setV} label="Resize">
          <nav>a</nav>
          <main>b</main>
        </ResizablePanels>
      );
    }
    const host = mount(<Host />);
    const sep = host.querySelector<HTMLElement>("[data-react-fancy-resizable-panels-separator]")!;
    key(sep, "ArrowLeft");
    expect(Number(sep.getAttribute("aria-valuenow"))).toBeGreaterThan(30);
  });

  it("ToastStack: ArrowLeft brings the NEXT toast to the front", () => {
    mount(
      <ToastStack position="inline" items={[{ id: "1", t: "one" }, { id: "2", t: "two" }, { id: "3", t: "three" }]} renderItem={(i) => <span>{i.t}</span>} />,
    );
    const stack = document.querySelector<HTMLElement>("[data-react-fancy-toast-stack]")!;
    key(stack, "ArrowLeft");
    expect(document.querySelector('[data-react-fancy-toast-stack-card="front"]')?.textContent).toBe("two");
  });

  it("TimeGrid (typed): ArrowLeft moves to the next column", () => {
    const cells = [["a", "b", "c"].map(() => ({ state: "open" }))];
    const host = mount(<TimeGrid rows={["Mon"]} cols={["0", "1", "2"]} cells={cells} states={{ open: { label: "Open" } }} />);
    const g = host.querySelector<HTMLElement>('[role="grid"]')!;
    act(() => g.focus());
    key(g, "ArrowLeft");
    const active = document.getElementById(g.getAttribute("aria-activedescendant")!);
    expect(active?.getAttribute("data-react-fancy-timegrid-cell")).toBe("0:1");
  });

  it("ReorderableGrid: a picked-up cell moves forward on ArrowLeft", () => {
    const items = ["a", "b", "c"].map((id) => ({ id }));
    const host = mount(<ReorderableGrid items={items} columns={3} renderItem={(i) => <span>{i.id}</span>} />);
    const cell = (id: string) => host.querySelector<HTMLElement>(`[data-reorderable-id="${id}"]`)!;
    act(() => cell("a").focus());
    key(cell("a"), " ");
    key(cell("a"), "ArrowLeft");
    const order = [...host.querySelectorAll("[data-reorderable-id]")].map((c) => c.getAttribute("data-reorderable-id"));
    expect(order).toEqual(["b", "a", "c"]);
  });
});

describe("numbers and code stay left-to-right", () => {
  it("OtpInput keeps its cells in LTR order and arrows move visually", () => {
    const host = mount(<OtpInput length={4} />);
    const root = host.querySelector<HTMLElement>("[data-react-fancy-otp-input]")!;
    expect(root.getAttribute("dir")).toBe("ltr");
    const inputs = [...root.querySelectorAll("input")];
    act(() => inputs[1].focus());
    key(inputs[1], "ArrowLeft");
    expect(document.activeElement).toBe(inputs[0]);
  });

  it("CodeBlock's <pre> and CodeView's root are dir=ltr", () => {
    const host = mount(
      <>
        <CodeBlock code="const a = 1;" language="js" />
        <CodeView value="<p>x</p>" language="html" />
      </>,
    );
    expect(host.querySelector("[data-react-fancy-code-block-pre]")?.getAttribute("dir")).toBe("ltr");
    expect(host.querySelector("[data-react-fancy-code-view]")?.getAttribute("dir")).toBe("ltr");
  });
});

describe("computed positions land on the inline side", () => {
  function Probe({ placement }: { placement: "bottom-start" | "bottom-end" }) {
    const anchor = useRef<HTMLDivElement | null>(null);
    const floating = useRef<HTMLDivElement | null>(null);
    const pos = useFloatingPosition(anchor, floating, { placement, offset: 0 });
    return (
      <>
        <div
          ref={(el) => {
            anchor.current = el;
            if (el) rect(el, { left: 600, top: 100, width: 200, height: 30 });
          }}
        />
        <div
          ref={(el) => {
            floating.current = el;
            if (el) rect(el, { left: 0, top: 0, width: 120, height: 50 });
          }}
          data-x={pos.x}
          data-dir={pos.dir}
        />
      </>
    );
  }
  const x = (host: HTMLElement) => Number(host.querySelector("[data-x]")!.getAttribute("data-x"));

  it("bottom-start aligns with the anchor's RIGHT edge in RTL, its left in LTR", () => {
    expect(x(mount(<Probe placement="bottom-start" />, "ltr"))).toBe(600);
    const rtl = mount(<Probe placement="bottom-start" />);
    expect(x(rtl)).toBe(800 - 120);
    expect(rtl.querySelector("[data-dir]")!.getAttribute("data-dir")).toBe("rtl");
  });

  it("bottom-end aligns with the anchor's LEFT edge in RTL", () => {
    expect(x(mount(<Probe placement="bottom-end" />))).toBe(600);
  });

  it("ContextMenu opens toward the inline end of the pointer, and carries the dir", () => {
    const host = mount(
      <ContextMenu>
        <ContextMenu.Trigger>
          <div data-area="">area</div>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Cut</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>,
    );
    const area = host.querySelector("[data-area]")!;
    act(() => {
      area.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 500, clientY: 40 }));
    });
    const menu = document.querySelector<HTMLElement>("[data-react-fancy-context-menu]")!;
    expect(menu.getAttribute("dir")).toBe("rtl");
    expect(menu.style.left).toBe("500px");
    // Anchors its RIGHT edge at the pointer.
    expect(menu.style.translate).toBe("-100% 0");
  });

  it("MultiSwitch measures its thumb from the right edge in RTL", () => {
    const host = mount(<MultiSwitch list={["A", "B"]} defaultValue="B" />);
    const root = host.querySelector<HTMLElement>("[data-react-fancy-multi-switch]")!;
    const [a, b] = [...root.querySelectorAll<HTMLElement>('[role="radio"]')];
    rect(root, { left: 0, top: 0, width: 202, height: 30 });
    rect(b, { left: 1, top: 0, width: 100, height: 30 });
    rect(a, { left: 101, top: 0, width: 100, height: 30 });
    // Re-measure with the rects in place.
    act(() => window.dispatchEvent(new Event("resize")));
    act(() => (root.querySelector('[role="radio"][aria-checked="false"]') as HTMLElement).click());
    act(() => (root.querySelector('[role="radio"][aria-checked="false"]') as HTMLElement).click());
    const thumb = root.querySelector<HTMLElement>("[data-react-fancy-multi-switch-thumb]")!;
    expect(thumb.style.right).toBe("101px");
    expect(thumb.style.left).toBe("");
  });

  it("InputTag's default placement starts at the anchor's right edge in RTL", () => {
    let push: (s: InputTagAdapterState) => void = () => {};
    const adapter: InputTagAdapter = {
      subscribe: (fn) => {
        push = fn;
        return () => {};
      },
      replaceRange: () => {},
      getAnchorRect: () => ({ left: 100, right: 400, top: 10, bottom: 40, width: 300, height: 30, x: 100, y: 10, toJSON() {} }) as DOMRect,
      onKey: () => () => {},
    };
    mount(<InputTag adapter={adapter} triggers={{ "/": { items: [{ name: "/a" }], keyOf: (i: { name: string }) => i.name, render: (i: { name: string }) => i.name, insert: (i: { name: string }) => i.name, filter: () => true } }} />);
    act(() => push({ text: "/", caretIndex: 1 }));
    const pop = document.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(pop.style.right).toBe(`${window.innerWidth - 400}px`);
    expect(pop.style.left).toBe("");
  });
});

describe("logical sides and defaults", () => {
  it("Drawer defaults to the inline END and maps start / end to logical classes", () => {
    mount(<Drawer open onClose={() => {}}><Drawer.Body>x</Drawer.Body></Drawer>);
    const panel = document.querySelector<HTMLElement>("[data-react-fancy-drawer]")!;
    expect(panel.dataset.side).toBe("end");
    expect(panel.className).toContain("end-0");
    expect(panel.className).toContain("fancy-slide-in-end");
    expect(panel.className).toContain("border-s");
  });

  it("Drawer side=start", () => {
    mount(<Drawer open onClose={() => {}} side="start"><Drawer.Body>x</Drawer.Body></Drawer>);
    const panel = document.querySelector<HTMLElement>("[data-react-fancy-drawer]")!;
    expect(panel.className).toContain("start-0");
    expect(panel.className).toContain("fancy-slide-in-start");
  });

  it("Toast and ToastStack default to the bottom inline-end corner", () => {
    mount(<Toast.Provider><span /></Toast.Provider>);
    expect(document.querySelector("[data-react-fancy-toast]")!.className).toContain("end-4");
    mount(<ToastStack items={[{ id: "1" }]} renderItem={() => <span>x</span>} />);
    expect(document.querySelector("[data-react-fancy-toast-stack-position]")!.getAttribute("data-react-fancy-toast-stack-position")).toBe("bottom-end");
  });

  it("StatList aligns to the inline end by default; align=right stays physical", () => {
    const host = mount(
      <>
        <StatList items={[{ value: "1", label: "a" }]} />
        <StatList items={[{ value: "1", label: "a" }]} align="right" />
      </>,
    );
    const [def, right] = [...host.querySelectorAll<HTMLElement>("[data-react-fancy-stat-list]")];
    expect(def.dataset.align).toBe("end");
    expect(def.className).toContain("items-end text-end");
    expect(right.className).toContain("rtl:items-start");
    expect(right.className).toContain("text-right");
  });

  it("MobileMenu.Flyout defaults to the inline start", () => {
    mount(<MobileMenu.Flyout open onClose={() => {}}><span>x</span></MobileMenu.Flyout>);
    const panel = document.querySelector("[data-react-fancy-mobile-menu-flyout] > div:last-child")!;
    expect(panel.className).toContain("start-0");
    expect(panel.className).toContain("fancy-slide-in-start");
  });
});

describe("direction-meaning glyphs mirror, others do not", () => {
  it("Switch's knob travels toward the inline end", () => {
    const host = mount(<Switch defaultChecked />);
    const knob = host.querySelector("button span")!;
    expect(knob.className).toContain("rtl:-translate-x-4");
  });

  it("Carousel's default arrows mirror; a consumer's label does not", () => {
    const host = mount(
      <>
        <Carousel><Carousel.Panels><Carousel.Slide>1</Carousel.Slide><Carousel.Slide>2</Carousel.Slide></Carousel.Panels><Carousel.Controls /></Carousel>
        <Carousel><Carousel.Panels><Carousel.Slide>1</Carousel.Slide></Carousel.Panels><Carousel.Controls prevLabel="Back" nextLabel="On" /></Carousel>
      </>,
    );
    const [def, custom] = [...host.querySelectorAll("[data-react-fancy-carousel-controls]")];
    for (const b of def.querySelectorAll("button")) expect(b.className).toContain("rtl:-scale-x-100");
    for (const b of custom.querySelectorAll("button")) expect(b.className).not.toContain("rtl:-scale-x-100");
  });

  it("Sidebar's collapse toggle and a horizontal AccordionPanel chevron mirror", () => {
    const host = mount(
      <>
        <Sidebar><Sidebar.Toggle /></Sidebar>
        <AccordionPanel orientation="horizontal" defaultValue={[]}>
          <AccordionPanel.Section id="a"><AccordionPanel.Trigger /><AccordionPanel.Content>x</AccordionPanel.Content></AccordionPanel.Section>
        </AccordionPanel>
        <AccordionPanel orientation="vertical" defaultValue={[]}>
          <AccordionPanel.Section id="b"><AccordionPanel.Trigger /><AccordionPanel.Content>y</AccordionPanel.Content></AccordionPanel.Section>
        </AccordionPanel>
      </>,
    );
    expect(host.querySelector("[data-react-fancy-sidebar-toggle] svg")!.getAttribute("class")).toContain("rtl:-scale-x-100");
    const [horizontal, vertical] = [...host.querySelectorAll('svg:has(polyline[points="6 4 10 8 6 12"])')];
    expect(horizontal.getAttribute("class") ?? "").toContain("rtl:-scale-x-100");
    expect(vertical.getAttribute("class") ?? "").not.toContain("rtl:-scale-x-100");
  });

  it("Breadcrumbs separators and Pagination chevrons mirror", () => {
    const host = mount(
      <>
        <Breadcrumbs><Breadcrumbs.Item href="#">a</Breadcrumbs.Item><Breadcrumbs.Item active>b</Breadcrumbs.Item></Breadcrumbs>
        <Pagination page={2} totalPages={3} onPageChange={() => {}} />
      </>,
    );
    const svgs = [...host.querySelectorAll("[data-react-fancy-breadcrumbs] svg, [data-react-fancy-pagination] svg")];
    expect(svgs.length).toBeGreaterThanOrEqual(3);
    for (const s of svgs) expect(s.getAttribute("class")).toContain("rtl:-scale-x-100");
  });
});

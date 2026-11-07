// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { Calendar } from "../src/components/Calendar";
import { Carousel } from "../src/components/Carousel";
import { MoodMeter } from "../src/components/MoodMeter";
import { Pagination } from "../src/components/Pagination";
import { Table, TablePagination } from "../src/components/Table";
import { TimeGrid } from "../src/components/TimeGrid";
import { TimePicker } from "../src/components/TimePicker";
import { Avatar } from "../src/components/Avatar";
import { ReasonTag } from "../src/components/ReasonTag";
import { VideoViewer } from "../src/components/VideoViewer";
import { MagicWand } from "../src/components/MagicWand";
import { Accordion } from "../src/components/Accordion";
import { Chart } from "../src/components/Chart";
import { Editor } from "../src/components/Editor";
import { Composer } from "../src/components/Composer";
import { Pillbox } from "../src/components/Pillbox/Pillbox";
import { FileBrowser, type FileSnapshotNode } from "../src/components/FileBrowser";
import { AA, cls, expectContrast, expectText, fg, mount, surface, unmountAll } from "./contrast-assert";

/**
 * Default contrast of secondary text in data displays (calendar headers, step
 * numbers, quadrant labels, page counters, grid headers, annotations) and of
 * every placeholder the audit found. Readable text owes AA (4.5:1) in light and
 * dark, on the surface it actually sits on; several of these sit on a tint
 * (a zinc-100 step disc, a zinc-50 / zinc-950 pad, a zinc-200 avatar), where
 * the muted token cannot reach AA and a stronger one is used.
 * Decorative glyphs (separators, the time colon) owe no contrast; they must be
 * hidden from assistive tech instead. 6.12.0.
 */

afterEach(() => unmountAll());

const byText = (root: ParentNode, text: string, sel = "*") =>
  [...root.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.trim() === text && e.children.length === 0) ??
  null;

describe("Calendar", () => {
  it("weekday header and days outside the month are readable", () => {
    const { host } = mount(<Calendar visibleMonth={new Date(2026, 9, 1)} />);
    expectText("weekday header", byText(host, "Mo"));
    // October 2026 starts on a Thursday: the first row opens with Sep 27-30.
    const outside = [...host.querySelectorAll("button")].find((b) => b.textContent === "27");
    expectText("day outside the month", outside);
  });
});

describe("Carousel wizard step number (on the zinc-100 / zinc-800 disc)", () => {
  it("an upcoming step's number", () => {
    const { host } = mount(
      <Carousel variant="wizard">
        <Carousel.Steps />
        <Carousel.Panels>
          <Carousel.Slide>1</Carousel.Slide>
          <Carousel.Slide>2</Carousel.Slide>
        </Carousel.Panels>
      </Carousel>,
    );
    const num = byText(host, "2", "span");
    expect(num).not.toBeNull();
    expectText("upcoming step number", num);
  });
});

describe("MoodMeter quadrant labels (on the zinc-50 / zinc-950 pad)", () => {
  it("all four corners", () => {
    const { host } = mount(<MoodMeter value={50} confidence={0.5} onChange={() => {}} />);
    const labels = [...host.querySelectorAll<HTMLElement>("div")].filter((d) => cls(d).includes("tracking-wider"));
    expect(labels).toHaveLength(4);
    for (const l of labels) expectText(`MoodMeter "${l.textContent}"`, l);
  });
});

describe("paging", () => {
  it("Pagination ellipsis", () => {
    const { host } = mount(<Pagination page={5} totalPages={20} onPageChange={() => {}} />);
    const dots = byText(host, "...", "span");
    expect(dots).not.toBeNull();
    expectText("Pagination ellipsis", dots);
  });

  it("Table 'Page 1 of N'", () => {
    const { host } = mount(
      <Table>
        <TablePagination total={40} />
      </Table>,
    );
    const label = [...host.querySelectorAll("span")].find((s) => s.textContent?.startsWith("Page "));
    expectText("Table page label", label);
  });
});

describe("TimeGrid headers", () => {
  // The boolean grid (no `cells`). The typed grid's column headers were on
  // the faint token until 6.13.0; `grey-text-contrast-faint` measures them.
  it("column and row headers, at rest and on hover", () => {
    const { host } = mount(
      <TimeGrid rows={["Mon"]} cols={["9", "10"]} value={[[false, false]]} onChange={() => {}} toggleStripsOnHeaderClick />,
    );
    const col = host.querySelector("[data-react-fancy-timegrid-col]");
    const row = host.querySelector("[data-react-fancy-timegrid-row]");
    expectText("TimeGrid column header", col);
    expectText("TimeGrid column header, hover", col, undefined, "hover");
    expectText("TimeGrid row header", row);
    expectText("TimeGrid row header, hover", row, undefined, "hover");
  });
});

describe("TimePicker", () => {
  it("the colon is decorative and hidden from assistive tech", () => {
    const { host } = mount(<TimePicker defaultValue="09:30" />);
    const colon = byText(host, ":", "span");
    expect(colon?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("annotations", () => {
  it("Avatar initials (on the zinc-200 / zinc-700 fill)", () => {
    const { host } = mount(<Avatar fallback="AB" />);
    expectText("Avatar initials", byText(host, "AB"));
  });

  it("ReasonTag pinned reason", () => {
    const { host } = mount(<ReasonTag value="42" reason="Because the totals agree" pinned />);
    expectText("ReasonTag pinned reason", byText(host, "Because the totals agree"));
  });

  it("ReasonTag popover: author, 'sources' heading, an unlinked source", () => {
    vi.useFakeTimers();
    const { host } = mount(
      <ReasonTag value="42" reason="why" by="agent" sources={[{ label: "ledger.csv" }]} />,
    );
    const dot = host.querySelector("[title='reason available']")!;
    // A hover popover: React derives onMouseEnter from mouseover, then waits
    // out the hover delay.
    act(() => {
      dot.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }));
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    vi.useRealTimers();
    const by = byText(document, "@agent");
    expect(by).not.toBeNull();
    expectText("ReasonTag author", by);
    expectText("ReasonTag sources heading", byText(document, "sources"));
    expectText("ReasonTag source", byText(document, "ledger.csv"));
  });

  it("VideoViewer error message (on its black frame, in both modes)", () => {
    const { host } = mount(<VideoViewer src="/missing.mp4" />);
    act(() => {
      host.querySelector("video")!.dispatchEvent(new Event("error"));
    });
    const msg = byText(host, "Couldn’t load video") ?? byText(host, "Couldn't load video");
    expect(msg).not.toBeNull();
    expectText("VideoViewer error", msg, { light: "black", dark: "black" });
  });

  it("MagicWand action tag (on the zinc-100 / zinc-800 badge)", () => {
    function Host() {
      const [v, setV] = useState("abc def");
      return (
        <MagicWand value={v} onValueChange={setV} actions={[{ id: "up", label: "Upper", tag: "AI", run: (s) => s.toUpperCase() }]} />
      );
    }
    mount(<Host />);
    const ta = document.querySelector("textarea")!;
    act(() => {
      ta.setSelectionRange(0, 3);
      ta.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    const tag = byText(document, "AI", "span");
    expect(tag).not.toBeNull();
    expectText("MagicWand tag", tag);
  });

  it("Accordion trigger hover stays readable", () => {
    const { host } = mount(
      <Accordion>
        <Accordion.Item value="a">
          <Accordion.Trigger>Section</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    const t = host.querySelector("button")!;
    // At rest it inherits the page's text; only the hover colour is the kit's.
    const hover = fg(t, "hover");
    expectContrast("Accordion trigger hover", hover, surface(t), AA);
  });

  it("chart tick marks and the hover rule are themed, not fixed greys", () => {
    const { host } = mount(<Chart.Line labels={["a", "b"]} series={[{ label: "s", data: [1, 2] }]} animate={false} />);
    act(() => {
      host.firstElementChild!.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 5, clientY: 5 }));
    });
    // The tick marks (a line beside each tick label) and the dashed hover rule
    // were part of the sweep. The gridlines and the axis baseline (zinc-100 /
    // zinc-200 background rules) were not.
    const ticks = [...host.querySelectorAll("g > line[stroke='currentColor']")].filter((l) =>
      l.parentElement!.querySelector(":scope > text"),
    );
    // The hover rule is a direct child of the svg; gridlines live in a group.
    const rule = host.querySelector("svg > line[stroke-dasharray]");
    expect(rule).not.toBeNull();
    const lines = [...ticks, rule!];
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines) {
      expect(cls(line)).toMatch(/text-\[color:var\(--fancy-text-faint,/);
      expect(cls(line)).toMatch(/dark:text-\[color:var\(--fancy-text-faint-dark,/);
    }
  });
});

describe("placeholders reach AA on their field", () => {
  it("Editor empty-state placeholder", () => {
    const { host } = mount(
      <Editor value="" onChange={() => {}} outputFormat="html" placeholder="Write something">
        <Editor.Content />
      </Editor>,
    );
    const content = host.querySelector("[data-placeholder]");
    expect(content).not.toBeNull();
    expectContrast("Editor placeholder", fg(content, "empty-before"), surface(content), AA);
  });

  it("Composer textarea and its inline-paste editor", () => {
    const { host } = mount(<Composer placeholder="Message" />);
    const ta = host.querySelector("textarea");
    expectContrast("Composer placeholder", fg(ta, "placeholder"), surface(ta), AA);
    unmountAll();

    const { host: h2 } = mount(<Composer pastePlacement="inline" placeholder="Message" />);
    const fake = byText(h2, "Message", "span");
    expect(fake).not.toBeNull();
    expectText("Inline paste editor placeholder", fake);
  });

  it("Pillbox input", () => {
    const { host } = mount(<Pillbox placeholder="Add a tag" />);
    const input = host.querySelector("input");
    // The field's own fill is the input token: white, and #1e1e24 in dark.
    expectContrast("Pillbox placeholder", fg(input, "placeholder"), surface(input, { light: "white", dark: "#1e1e24" }), AA);
  });

  it("FileBrowser filter, path and new-folder inputs", () => {
    const SNAPSHOT: FileSnapshotNode[] = [
      { path: "/src", name: "src", kind: "directory", children: [{ path: "/src/a.ts", name: "a.ts", kind: "file" }] },
    ];
    const { host } = mount(<FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={() => {}} />);
    const filter = host.querySelector("[data-react-fancy-file-browser-filter] input");
    expectContrast("FileBrowser filter placeholder", fg(filter, "placeholder"), surface(filter), AA);

    act(() => {
      host.querySelector('button[aria-label="Edit path"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const pathInput = host.querySelector("[data-react-fancy-file-browser-path-input]");
    expectContrast("FileBrowser path placeholder", fg(pathInput, "placeholder"), surface(pathInput), AA);
  });
});

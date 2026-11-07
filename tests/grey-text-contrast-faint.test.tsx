// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { Input } from "../src/components/inputs/Input/Input";
import { Textarea } from "../src/components/inputs/Textarea/Textarea";
import { Select } from "../src/components/inputs/Select/Select";
import { Autocomplete } from "../src/components/Autocomplete/Autocomplete";
import { Carousel } from "../src/components/Carousel";
import { TimeGrid } from "../src/components/TimeGrid";
import { Menu } from "../src/components/Menu";
import { Sidebar } from "../src/components/Sidebar";
import { FileBrowser, type FileSnapshotNode } from "../src/components/FileBrowser";
import { FauxClient } from "../src/components/FauxClient";
import { IndexList } from "../src/components/IndexList";
import { AccordionPanel } from "../src/components/AccordionPanel";
import { Table } from "../src/components/Table";
import { TableRow } from "../src/components/Table/TableRow";
import { TableCell } from "../src/components/Table/TableCell";
import { AA, expectContrast, expectControl, expectText, fg, mount, surface, unmountAll, type Pair } from "./contrast-assert";

/**
 * Readable text that 6.12.0 left on the FAINT token. Faint's defaults are
 * zinc-400 / zinc-500: 2.62:1 on the kit's white surface and 3.67:1 on its
 * zinc-900 dark surface, under AA (4.5:1) in both modes. That is right for a
 * decorative glyph and wrong for anything a person reads: a placeholder, an
 * empty-value prompt, a column header, a step name. Each of these now reads
 * muted (zinc-500 / zinc-400: 4.83:1 / 6.75:1), or subtle where it sits on a
 * zinc-100 fill that muted cannot clear (owner: "move them to muted", 6.13.0).
 *
 * Measured for an app that sets no `--fancy-*` variable. `grey-text-tokens`
 * keeps the faint token to an allowlist of decorative lines, so new readable
 * text cannot land on it.
 */

/** The input token's fill: white, and #1e1e24 in dark. */
const FIELD: Pair = { light: "white", dark: "#1e1e24" };

beforeEach(() => {
  (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView = vi.fn();
});
afterEach(() => {
  unmountAll();
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
});

function click(el: Element | null) {
  act(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

const byText = (root: ParentNode, text: string, sel = "*") =>
  [...root.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.trim() === text && e.children.length === 0) ??
  null;

describe("placeholders", () => {
  it("Input and Textarea (the shared field classes)", () => {
    const { host } = mount(<Input placeholder="Email" />);
    expectContrast("Input placeholder", fg(host.querySelector("input"), "placeholder"), FIELD, AA);
    const { host: h2 } = mount(<Textarea placeholder="Notes" />);
    expectContrast("Textarea placeholder", fg(h2.querySelector("textarea"), "placeholder"), FIELD, AA);
  });

  it("Select search box (on its zinc-100 / zinc-800 fill)", () => {
    const { host } = mount(<Select variant="listbox" searchable list={["Apple"]} />);
    click(host.querySelector("button"));
    const search = document.querySelector('[role="listbox"] input');
    expect(search).not.toBeNull();
    expectContrast("Select search placeholder", fg(search, "placeholder"), surface(search), AA);
  });

  it("Autocomplete", () => {
    const { host } = mount(<Autocomplete options={[]} placeholder="Find" />);
    const input = host.querySelector("input");
    expectContrast("Autocomplete placeholder", fg(input, "placeholder"), surface(input), AA);
  });
});

describe("empty-value text", () => {
  it("Select listbox trigger with nothing chosen", () => {
    const { host } = mount(<Select variant="listbox" list={["Apple"]} placeholder="Pick a fruit" />);
    expectText("Select empty value", byText(host, "Pick a fruit", "span"), FIELD);
  });

  it("Autocomplete view mode with no value", () => {
    // Its text is "" (the value defaults to ""), so measure the element that
    // paints the empty state rather than a glyph.
    const { host } = mount(<Autocomplete mode="view" options={[]} />);
    expectText("Autocomplete empty view value", host.querySelector("[data-react-fancy-autocomplete]"));
  });

  it("a view-mode field's empty value and its affixes", () => {
    const { host } = mount(<Input mode="view" prefix="$" suffix="USD" />);
    expectText("view-mode empty value", byText(host, "—"));
    expectText("view-mode prefix", byText(host, "$"));
    expectText("view-mode suffix", byText(host, "USD"));
  });
});

describe("field affixes inside the box", () => {
  it("Input leading / trailing text", () => {
    const { host } = mount(<Input leading="https://" trailing=".com" />);
    expectText("Input leading", byText(host, "https://"), FIELD);
    expectText("Input trailing", byText(host, ".com"), FIELD);
  });

  it("InputWrapper inside prefix / suffix", () => {
    const { host } = mount(<Select list={["a"]} prefix="Qty" suffix="kg" prefixPosition="inside" suffixPosition="inside" />);
    expectText("inside prefix", byText(host, "Qty"), FIELD);
    expectText("inside suffix", byText(host, "kg"), FIELD);
  });

  it("InputWrapper inside prefix with an outside suffix", () => {
    const { host } = mount(<Select list={["a"]} prefix="Qty" suffix="kg" prefixPosition="inside" suffixPosition="outside" />);
    expectText("inside prefix (mixed)", byText(host, "Qty"), FIELD);
  });

  it("InputWrapper inside suffix with an outside prefix", () => {
    const { host } = mount(<Select list={["a"]} prefix="Qty" suffix="kg" prefixPosition="outside" suffixPosition="inside" />);
    expectText("inside suffix (mixed)", byText(host, "kg"), FIELD);
  });
});

describe("secondary labels", () => {
  it("Select option description", () => {
    const { host } = mount(<Select variant="listbox" list={[{ value: "a", label: "Apple", description: "A fruit" }]} />);
    click(host.querySelector("button"));
    expectText("Select option description", byText(document, "A fruit"));
  });

  it("typed TimeGrid column headers", () => {
    const { host } = mount(
      <TimeGrid
        rows={["Mon"]}
        cols={["9", "10"]}
        cells={[[{ state: "open" }, { state: "open" }]]}
        states={{ open: { tone: "emerald", label: "Open" } }}
      />,
    );
    const col = host.querySelector("[data-react-fancy-timegrid][data-typed] [data-react-fancy-timegrid-col]");
    expect(col).not.toBeNull();
    expectText("typed TimeGrid column header", col);
  });

  it("Carousel wizard: an upcoming step's name", () => {
    const { host } = mount(
      <Carousel variant="wizard">
        <Carousel.Steps />
        <Carousel.Panels>
          <Carousel.Slide name="Details">1</Carousel.Slide>
          <Carousel.Slide name="Review">2</Carousel.Slide>
        </Carousel.Panels>
      </Carousel>,
    );
    const name = byText(host, "Review", "span");
    expect(name).not.toBeNull();
    expectText("upcoming step name", name);
  });

  it("Menu and Sidebar group headings", () => {
    const { host } = mount(
      <Menu>
        <Menu.Group label="Workspace">
          <Menu.Item>Home</Menu.Item>
        </Menu.Group>
      </Menu>,
    );
    expectText("Menu group heading", byText(host, "Workspace"));
    const { host: h2 } = mount(
      <Sidebar>
        <Sidebar.Group label="Projects">
          <Sidebar.Item>tynn</Sidebar.Item>
        </Sidebar.Group>
      </Sidebar>,
    );
    expectText("Sidebar group heading", byText(h2, "Projects"));
  });

  it("FileBrowser status row and file size", () => {
    const SNAPSHOT: FileSnapshotNode[] = [
      {
        path: "/src",
        name: "src",
        kind: "directory",
        children: [{ path: "/src/a.ts", name: "a.ts", kind: "file", size: 2048 }],
      },
    ];
    const { host } = mount(<FileBrowser snapshot={SNAPSHOT} defaultPath="/src" />);
    const size = [...host.querySelectorAll<HTMLElement>("span")].find((s) => /KB$/.test(s.textContent ?? ""));
    expect(size).toBeTruthy();
    expectText("FileBrowser file size", size);
    unmountAll();

    const { host: h2 } = mount(<FileBrowser snapshot={SNAPSHOT} defaultPath="/src" defaultFilter="zzz" />);
    const status = h2.querySelector("[data-react-fancy-file-browser-status]");
    expect(status).not.toBeNull();
    expectText("FileBrowser status", status!.querySelector("span"));
  });

  it("FauxClient browser bar meta and zoom readout (on the zinc-50 / zinc-950 bar)", () => {
    const { host } = mount(
      <FauxClient variant="browser" url="example.com" meta="1280 x 800" controls>
        x
      </FauxClient>,
    );
    expectText("FauxClient meta", byText(host, "1280 x 800"));
    const controls = host.querySelector("[data-react-fancy-faux-client-controls]");
    expect(controls).not.toBeNull();
    const pct = [...controls!.querySelectorAll<HTMLElement>("*")].find((e) => /%$/.test(e.textContent?.trim() ?? "") && e.children.length === 0);
    expect(pct).toBeTruthy();
    expectText("FauxClient zoom readout", pct);
    for (const b of controls!.querySelectorAll("button")) {
      if (b.querySelector("svg")) expectControl("FauxClient control", b, surface(controls));
    }
  });

  it("IndexList number", () => {
    const { host } = mount(<IndexList items={[{ num: "01", title: "Intro" }]} />);
    expectText("IndexList number", host.querySelector("[data-react-fancy-index-num]"));
  });
});

describe("icon-only controls left on faint (3:1, WCAG 1.4.11)", () => {
  it("AccordionPanel trigger while closed", () => {
    const { host } = mount(
      <AccordionPanel defaultValue={[]}>
        <AccordionPanel.Section id="a">
          <AccordionPanel.Trigger />
          <AccordionPanel.Content>x</AccordionPanel.Content>
        </AccordionPanel.Section>
      </AccordionPanel>,
    );
    const trigger = host.querySelector('[data-react-fancy-accordion-trigger][data-state="closed"]');
    expect(trigger).not.toBeNull();
    expectControl("AccordionPanel closed trigger", trigger);
  });

  it("Table row expand toggle", () => {
    const { host } = mount(
      <Table>
        <tbody>
          <TableRow tray={<div>more</div>}>
            <TableCell>a</TableCell>
          </TableRow>
        </tbody>
      </Table>,
    );
    expectControl("Table row expand", host.querySelector('button[aria-label="Expand row"]'));
  });
});

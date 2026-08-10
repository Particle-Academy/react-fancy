// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Table } from "../src/components/Table/Table";
import { TableHead } from "../src/components/Table/TableHead";
import { TableBody } from "../src/components/Table/TableBody";
import { TableRow } from "../src/components/Table/TableRow";
import { TableCell } from "../src/components/Table/TableCell";
import { TableColumn } from "../src/components/Table/TableColumn";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    click: (selector: string) => {
      const node = host.querySelector<HTMLElement>(selector);
      if (!node) throw new Error(`no element matched ${selector}`);
      act(() => node.click());
    },
    unmount: () => act(() => root.unmount()),
  };
}

const sortableTable = (
  <Table>
    <TableHead>
      <TableRow>
        <TableColumn label="Name" sortKey="name" />
        <TableColumn label="Age" sortKey="age" />
        <TableColumn label="Notes" />
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCell>a</TableCell>
        <TableCell>1</TableCell>
        <TableCell>-</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

/**
 * `Table.Column` knows its sort state and never tells anyone who cannot see it.
 *
 * The component computes `isSorted` and `sortDir`, and spends both entirely on
 * rendering a ▲/▼ glyph. `aria-sort` — the one attribute that exists for
 * precisely this, and which screen readers announce on a column header — was
 * never emitted, so a sortable table sounded identical to a static one and
 * gave no feedback at all when a header was activated.
 *
 * That is the same shape as #19 and #22 one level up: state that is present,
 * correct, and wired only to something visual.
 *
 * Found while auditing the Table family for the leftover half of #19 —
 * `Table.Row` and `Table.Cell` were fixed in 5.8.0 and #5, and `Table.Column`
 * was missed because nothing about it looked like a prop-forwarding bug.
 */
describe("Table.Column announces its sort state", () => {
  it("marks an unsorted sortable column as aria-sort=none", () => {
    // "none" is not the same as absent: it tells assistive tech the column IS
    // sortable but is not currently the sort key. Omitting it makes a sortable
    // column indistinguishable from one that cannot sort at all.
    const { host, unmount } = mount(sortableTable);
    const nameHeader = host.querySelectorAll("th")[0]!;

    expect(nameHeader.getAttribute("aria-sort")).toBe("none");
    unmount();
  });

  it("does NOT mark a non-sortable column", () => {
    // aria-sort on a header that cannot sort is a lie, and a worse one than
    // silence — it invites a user to activate something inert.
    const { host, unmount } = mount(sortableTable);
    const notesHeader = host.querySelectorAll("th")[2]!;

    expect(notesHeader.hasAttribute("aria-sort")).toBe(false);
    unmount();
  });

  it("becomes ascending, then descending, as the header is activated", () => {
    const { host, click, unmount } = mount(sortableTable);
    const nameHeader = () => host.querySelectorAll("th")[0]!;

    click("th");
    expect(nameHeader().getAttribute("aria-sort")).toBe("ascending");

    click("th");
    expect(nameHeader().getAttribute("aria-sort")).toBe("descending");

    unmount();
  });

  it("resets the previous column to none when the sort moves", () => {
    // The bug a per-column implementation ships: the old header keeps claiming
    // to be the sort key, so two columns announce themselves as sorted at once.
    const { host, click, unmount } = mount(sortableTable);
    const headers = () => host.querySelectorAll("th");

    click("th");
    expect(headers()[0]!.getAttribute("aria-sort")).toBe("ascending");

    act(() => headers()[1]!.click());
    expect(headers()[0]!.getAttribute("aria-sort")).toBe("none");
    expect(headers()[1]!.getAttribute("aria-sort")).toBe("ascending");

    unmount();
  });

  it("lets a caller override aria-sort explicitly", () => {
    // A server-sorted table knows its own state; the component must not
    // overwrite what the caller declared.
    const { host, unmount } = mount(
      <Table>
        <TableHead>
          <TableRow>
            <TableColumn label="Name" sortKey="name" aria-sort="descending" />
          </TableRow>
        </TableHead>
      </Table>,
    );

    expect(host.querySelector("th")!.getAttribute("aria-sort")).toBe("descending");
    unmount();
  });
});

/**
 * The rest of the Table family, audited in one pass rather than one report at a
 * time — which is what #22 asked for and what left `Table.Column` behind when
 * only the two reported components were fixed.
 */
describe("the whole Table family forwards handles", () => {
  const cases: Array<[string, ReactElement, string]> = [
    [
      "Table",
      <Table data-handle="t">
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
      "[data-handle]",
    ],
    [
      "Table.Head",
      <Table>
        <TableHead data-handle="h">
          <TableRow>
            <TableColumn label="A" />
          </TableRow>
        </TableHead>
      </Table>,
      "thead[data-handle]",
    ],
    [
      "Table.Body",
      <Table>
        <TableBody data-handle="b">
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
      "tbody[data-handle]",
    ],
    [
      "Table.Column",
      <Table>
        <TableHead>
          <TableRow>
            <TableColumn label="A" data-handle="c" />
          </TableRow>
        </TableHead>
      </Table>,
      "th[data-handle]",
    ],
  ];

  it.each(cases)("%s", (_name, el, selector) => {
    const { host, unmount } = mount(el);
    const found = host.querySelector(selector) !== null;
    unmount();
    expect(found).toBe(true);
  });

  it("a forwarded prop cannot clobber the internal marker or className", () => {
    // The spread has to come BEFORE the component's own attributes. The reverse
    // order lets a caller delete the data-react-fancy-* handle that the MCP
    // bridges address elements by.
    const { host, unmount } = mount(
      <Table>
        <TableHead>
          <TableRow>
            <TableColumn label="A" sortKey="a" className="mine" />
          </TableRow>
        </TableHead>
      </Table>,
    );

    const th = host.querySelector("th")!;
    expect(th.hasAttribute("data-react-fancy-table-column")).toBe(true);
    expect(th.className).toContain("mine");
    expect(th.className).toContain("px-4");
    unmount();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Table } from "../src/components/Table";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Table put only Table.Head and Table.Body inside its <table>. A footer row
 * (<tfoot>), a <caption> or a <colgroup> landed in the wrapper div, outside the
 * table: invalid markup, which axe and React's DOM-nesting check both report.
 * fancy-mlm-ui's totals row hit it and worked around it with a second
 * Table.Body. Table.Foot exists now, and the table parts go inside, in the
 * order HTML requires: caption, colgroup, thead, tbody, tfoot.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const order = (host: Element) =>
  Array.from(host.querySelector("table")!.children).map((c) => c.tagName.toLowerCase());

describe("Table.Foot", () => {
  it("renders a <tfoot> inside the table, after the body, with a stable handle", () => {
    const host = mount(
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.Cell header>Item</Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>One</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Foot>
          <Table.Row>
            <Table.Cell>Total</Table.Cell>
          </Table.Row>
        </Table.Foot>
      </Table>,
    );
    const tfoot = host.querySelector("tfoot")!;
    expect(tfoot).not.toBeNull();
    expect(tfoot.parentElement!.tagName).toBe("TABLE");
    expect(tfoot.hasAttribute("data-react-fancy-table-foot")).toBe(true);
    expect(order(host)).toEqual(["thead", "tbody", "tfoot"]);
  });

  it("passes className and attributes through", () => {
    const host = mount(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>One</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Foot className="totals" data-handle="totals">
          <Table.Row>
            <Table.Cell>Total</Table.Cell>
          </Table.Row>
        </Table.Foot>
      </Table>,
    );
    const tfoot = host.querySelector("tfoot")!;
    expect(tfoot.className).toContain("totals");
    expect(tfoot.getAttribute("data-handle")).toBe("totals");
  });
});

describe("Table puts every table part inside the <table>", () => {
  it("raw <caption>, <colgroup> and <tfoot> go inside, caption and colgroup first", () => {
    const host = mount(
      <Table>
        <div id="toolbar">toolbar</div>
        <Table.Head>
          <Table.Row>
            <Table.Cell header>Item</Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row>
            <Table.Cell>One</Table.Cell>
          </Table.Row>
        </Table.Body>
        <tfoot>
          <tr>
            <td>Total</td>
          </tr>
        </tfoot>
        <caption>Orders</caption>
        <colgroup>
          <col />
        </colgroup>
        <div id="pager">pager</div>
      </Table>,
    );
    const table = host.querySelector("table")!;
    for (const tag of ["caption", "colgroup", "tfoot"]) {
      expect(host.querySelector(tag)!.parentElement, `<${tag}> is inside the table`).toBe(table);
    }
    expect(order(host)).toEqual(["caption", "colgroup", "thead", "tbody", "tfoot"]);
    // Non-table children keep their place around the table.
    const root = host.querySelector("[data-react-fancy-table]")!;
    const kids = Array.from(root.children);
    expect(kids.map((k) => k.id || k.tagName.toLowerCase())).toEqual(["toolbar", "table", "pager"]);
  });

  it("a Table.Foot written before the body still renders after it", () => {
    const host = mount(
      <Table>
        <Table.Foot>
          <Table.Row>
            <Table.Cell>Total</Table.Cell>
          </Table.Row>
        </Table.Foot>
        <Table.Body>
          <Table.Row>
            <Table.Cell>One</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(order(host)).toEqual(["tbody", "tfoot"]);
  });
});

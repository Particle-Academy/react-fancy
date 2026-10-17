// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { TreeNav, useTreeNav } from "../src/components/TreeNav";
import type { TreeNodeData } from "../src/components/TreeNav";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

function mount(el: ReactElement): HTMLElement {
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

/**
 * A tree whose labels COUNT how often they are read. Every TreeNode render reads
 * its node's label, so the count per id is the number of times that row
 * rendered — deterministic, unlike timing.
 */
function countedTree(spec: { folders: number; files: number; depth: number }) {
  const reads = new Map<string, number>();
  const make = (id: string, label: string, extra: Partial<TreeNodeData>): TreeNodeData => {
    const node = { id, ...extra } as TreeNodeData;
    Object.defineProperty(node, "label", {
      enumerable: true,
      get() {
        reads.set(id, (reads.get(id) ?? 0) + 1);
        return label;
      },
    });
    return node;
  };
  const level = (depth: number, prefix: string): TreeNodeData[] => {
    const out: TreeNodeData[] = [];
    if (depth < spec.depth) {
      for (let f = 0; f < spec.folders; f++) {
        const id = `${prefix}d${f}`;
        out.push(make(id, `folder ${id}`, { type: "folder", children: level(depth + 1, `${id}/`) }));
      }
    }
    for (let i = 0; i < spec.files; i++) {
      const id = `${prefix}f${i}.ts`;
      out.push(make(id, `file ${id}`, { type: "file", ext: "ts" }));
    }
    return out;
  };
  const nodes = level(0, "");
  const rendersSince = () => {
    const snapshot = new Map(reads);
    return () => {
      const changed: string[] = [];
      for (const [id, n] of reads) if (n !== (snapshot.get(id) ?? 0)) changed.push(id);
      return changed.sort();
    };
  };
  return { nodes, rendersSince };
}

const row = (host: HTMLElement, label: string) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>("[data-react-fancy-tree-node] > button")).find(
    (b) => b.textContent === label,
  )!;

function click(el: Element) {
  act(() => {
    (el as HTMLElement).click();
  });
}

function Selectable(props: { nodes: TreeNodeData[]; virtualize?: boolean; defaultExpandAll?: boolean }) {
  const [selected, setSelected] = useState<string>();
  return (
    <TreeNav
      nodes={props.nodes}
      selectedId={selected}
      onSelect={(id) => setSelected(id)}
      defaultExpandAll={props.defaultExpandAll ?? true}
      virtualize={props.virtualize}
      height={300}
      rowHeight={24}
    />
  );
}

/**
 * Genie 2's file browser "bogs down the whole machine" (owner, 2026-10-17). Measured
 * in a real browser at Genie's cap of 5,000 nodes / 6 levels, all expanded: 614 ms
 * to mount and 175-267 ms for EVERY click, because selection and expansion lived in
 * one context that every row read — so one click re-rendered all 5,000 rows.
 * Collapsed folders were already free: their children are not mounted.
 */
describe("TreeNav — a click re-renders the rows it changes, not the tree", () => {
  it("selecting a row re-renders only that row and the one it replaced", () => {
    const { nodes, rendersSince } = countedTree({ folders: 3, files: 3, depth: 3 });
    const host = mount(<Selectable nodes={nodes} />);

    click(row(host, "file f0.ts"));
    const changed = rendersSince();
    click(row(host, "file d1/f2.ts"));

    expect(changed()).toEqual(["d1/f2.ts", "f0.ts"]);
  });

  it("toggling a folder re-renders that folder, not its siblings or the rest", () => {
    const { nodes, rendersSince } = countedTree({ folders: 3, files: 3, depth: 2 });
    const host = mount(<TreeNav nodes={nodes} defaultExpandAll />);

    const changed = rendersSince();
    click(row(host, "folder d2"));

    // d2 collapses; its children unmount (no render). Nothing else renders.
    expect(changed()).toEqual(["d2"]);
  });

  it("a folder's children are not mounted until it is expanded", () => {
    const { nodes } = countedTree({ folders: 3, files: 3, depth: 3 });
    const host = mount(<TreeNav nodes={nodes} />);

    expect(host.querySelectorAll("[data-react-fancy-tree-node]")).toHaveLength(6);
  });

  it("useTreeNav() still sees live selection and expansion", () => {
    // Public API: a consumer reading the context must not get a stale snapshot.
    const seen: Array<{ selected?: string; expanded: number }> = [];
    function Probe() {
      const ctx = useTreeNav();
      seen.push({ selected: ctx.selectedId, expanded: ctx.expandedIds.length });
      return null;
    }
    const { nodes } = countedTree({ folders: 2, files: 2, depth: 2 });
    const nodesWithProbe: TreeNodeData[] = [
      { id: "probe", label: "probe", type: "file", icon: <Probe /> },
      ...nodes,
    ];
    const host = mount(<Selectable nodes={nodesWithProbe} defaultExpandAll={false} />);

    click(row(host, "file f1.ts"));
    click(row(host, "folder d0"));

    const last = seen[seen.length - 1];
    expect(last.selected).toBe("d0");
    expect(last.expanded).toBe(1);
  });
});

describe("TreeNav — virtualize", () => {
  it("renders only a window of rows, however large the expanded tree", () => {
    const { nodes } = countedTree({ folders: 4, files: 4, depth: 5 });
    const host = mount(<Selectable nodes={nodes} virtualize />);

    const domRows = host.querySelectorAll("[data-react-fancy-tree-node]").length;
    expect(domRows).toBeGreaterThan(5);
    expect(domRows).toBeLessThan(80);
  });

  it("indents by depth, flat in the DOM", () => {
    const { nodes } = countedTree({ folders: 2, files: 1, depth: 3 });
    const host = mount(<Selectable nodes={nodes} virtualize />);

    expect(host.querySelector("[data-react-fancy-tree-node-children]")).toBeNull();
    expect(row(host, "folder d0").style.paddingLeft).toBe("4px");
    expect(row(host, "folder d0/d0").style.paddingLeft).toBe("20px");
    expect(row(host, "folder d0/d0/d0").style.paddingLeft).toBe("36px");
  });

  it("collapsing a folder removes its rows, expanding brings them back", () => {
    const { nodes } = countedTree({ folders: 2, files: 1, depth: 2 });
    const host = mount(<Selectable nodes={nodes} virtualize />);

    expect(row(host, "file d0/f0.ts")).toBeDefined();
    click(row(host, "folder d0"));
    expect(row(host, "file d0/f0.ts")).toBeUndefined();
    click(row(host, "folder d0"));
    expect(row(host, "file d0/f0.ts")).toBeDefined();
  });

  it("selects and reports like the nested tree", () => {
    const picked: string[] = [];
    const { nodes } = countedTree({ folders: 1, files: 2, depth: 2 });
    const host = mount(
      <TreeNav nodes={nodes} defaultExpandAll virtualize height={300} onSelect={(id) => picked.push(id)} />,
    );

    click(row(host, "file d0/f1.ts"));

    expect(picked).toEqual(["d0/f1.ts"]);
  });

  it("is off by default: the nested structure is unchanged", () => {
    const { nodes } = countedTree({ folders: 1, files: 1, depth: 2 });
    const host = mount(<TreeNav nodes={nodes} defaultExpandAll />);

    expect(host.querySelector("[data-react-fancy-tree-node-children]")).not.toBeNull();
  });
});

describe("TreeNav — drag and drop survives the refactor", () => {
  /** jsdom has no DataTransfer; hand React the shape the handlers touch. */
  function dragEvent(type: string) {
    const ev = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "dataTransfer", {
      value: { setData: () => {}, getData: () => "", effectAllowed: "", dropEffect: "", files: [] },
    });
    Object.defineProperty(ev, "clientY", { value: 0 });
    return ev;
  }

  for (const virtualize of [false, true]) {
    it(`moves a node onto another (${virtualize ? "virtualized" : "nested"})`, () => {
      vi.useFakeTimers();
      const moves: string[] = [];
      const { nodes } = countedTree({ folders: 2, files: 2, depth: 1 });
      const host = mount(
        <TreeNav
          nodes={nodes}
          draggable
          virtualize={virtualize}
          height={300}
          onNodeMove={(s, t, p) => moves.push(`${s}->${t}:${p}`)}
        />,
      );

      act(() => {
        row(host, "file f0.ts").dispatchEvent(dragEvent("dragstart"));
      });
      act(() => {
        vi.runAllTimers(); // the drag state is set on the next frame
      });
      const target = row(host, "folder d1").parentElement!;
      act(() => {
        target.dispatchEvent(dragEvent("dragover"));
      });
      act(() => {
        target.dispatchEvent(dragEvent("drop"));
      });
      vi.useRealTimers();

      expect(moves).toHaveLength(1);
      expect(moves[0].startsWith("f0.ts->d1:")).toBe(true);
    });
  }
});

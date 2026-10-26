// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "../src/components/Editor/Editor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Source-preserving markdown output. A markdown document opened in the Editor
 * comes back byte-identical, and a one-place edit changes ONLY that place:
 * every block the person did not touch is emitted from its original source
 * text, with the original blank lines between blocks and the original
 * trailing newline.
 *
 * Requested by MOIC, whose agents write markdown notes (tables included) that
 * people then edit by hand.
 *
 * jsdom cannot perform contentEditable editing, so each edit applies the DOM
 * mutation real Chromium (155) was observed to produce for that keystroke.
 * Chromium CLONES the element it splits, attributes included, so a fresh
 * item or paragraph carries the same data-* attributes as the one before it.
 */

const MOIC_NOTES =
  "# Call notes\n\n- The buyer wants a pilot first\n\n- Legal is waiting on redlines\n- Next call is Thursday\n- Send the pricing sheet by Friday\n";

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    unmount: () => act(() => root.unmount()),
    content: () => host.querySelector<HTMLDivElement>('[contenteditable="true"]')!,
  };
}

function open(md: string) {
  const changes: string[] = [];
  const view = mount(
    <Editor
      defaultValue={md}
      outputFormat="markdown"
      valueFormat="markdown"
      onChange={(v: string) => changes.push(v)}
    >
      <Editor.Toolbar />
      <Editor.Content />
    </Editor>,
  );
  const el = view.content();
  const emit = () => {
    act(() => {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    return changes.at(-1)!;
  };
  return { el, emit, unmount: view.unmount };
}

/** Chromium's Enter: clone the element (attributes and all) after itself, holding `inner`. */
function enterAfter(el: Element, inner: string): Element {
  const clone = el.cloneNode(false) as Element;
  clone.innerHTML = inner;
  el.after(clone);
  return clone;
}

const CORPUS: Record<string, string> = {
  "MOIC's loose call notes, verbatim": MOIC_NOTES,
  "a table with alignment": "| Left | Center | Right | None |\n|:-----|:------:|------:|------|\n| a | b | c | d |\n| e \\| pipe | `f` | **g** | h |\n",
  "a table with ragged spacing and no outer pipes": "Name   | Qty\n:---   | ---:\napples | 3\npears  | 10\n",
  "a table between paragraphs": "Before.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nAfter.",
  "star bullets": "* one\n* two\n* three\n",
  "plus bullets": "+ one\n+ two\n",
  "underscore emphasis": "Some _em_ and __strong__ here.\n",
  escapes: "Literal \\*stars\\*, \\_underscores\\_ and a \\# hash.\n",
  "setext headings": "Title\n=====\n\nSubtitle\n--------\n\nBody.\n",
  "no trailing newline": "# Heading\n\nLast line",
  "several trailing newlines": "Text.\n\n\n",
  "multiple blank lines between blocks": "One.\n\n\n\nTwo.\n\n\nThree.\n",
  "an HTML block": "Intro.\n\n<div class=\"note\">\n<b>Raw</b> html\n</div>\n\nOutro.\n",
  "an HTML comment": "Intro.\n\n<!-- hidden note -->\n\nOutro.\n",
  "a reference link and its definition": "See [the docs][docs].\n\n[docs]: https://example.com/docs \"Docs\"\n\nMore.\n",
  "an ordered list with parens": "1) first\n2) second\n",
  "an indented code block": "Para.\n\n    indented code\n    more\n\nAfter.\n",
  "a heading with closing hashes": "## Title ##\n\nBody.\n",
  "a thematic break spelled with stars": "Above.\n\n***\n\nBelow.\n",
  "leading blank lines": "\n\n# Late start\n",
};

describe("Editor markdown output is source-preserving — no edit", () => {
  for (const [name, md] of Object.entries(CORPUS)) {
    it(`emits ${name} byte-identical`, () => {
      const ed = open(md);
      expect(ed.emit()).toBe(md);
      ed.unmount();
    });
  }
});

describe("Editor markdown output is source-preserving — one edit", () => {
  it("MOIC: Enter at the end of the last item + typing adds ONLY that item", () => {
    const ed = open(MOIC_NOTES);
    const items = ed.el.querySelectorAll("li");
    const last = items[items.length - 1]!;
    // Chromium, loose list (the item holds a <p>): a clone of the <li> with <p><br></p>.
    const fresh = enterAfter(last, "<p><br></p>");
    ed.emit();
    fresh.querySelector("p")!.replaceChildren(document.createTextNode("Book the security review"));
    expect(ed.emit()).toBe(`${MOIC_NOTES}- Book the security review\n`);
    ed.unmount();
  });

  it("adding an item to a * list keeps the * marker and the other items", () => {
    const md = "Intro _here_.\n\n* one\n* two\n";
    const ed = open(md);
    const items = ed.el.querySelectorAll("li");
    const fresh = enterAfter(items[1]!, "<br>");
    fresh.replaceChildren(document.createTextNode("three"));
    expect(ed.emit()).toBe("Intro _here_.\n\n* one\n* two\n* three\n");
    ed.unmount();
  });

  it("editing one item of a list leaves its sibling items verbatim", () => {
    const md = "+ alpha _a_\n+ beta\n+ gamma \\*g\\*\n";
    const ed = open(md);
    ed.el.querySelectorAll("li")[1]!.append(document.createTextNode(" two"));
    expect(ed.emit()).toBe("+ alpha _a_\n+ beta two\n+ gamma \\*g\\*\n");
    ed.unmount();
  });

  it("editing a paragraph next to a table leaves the table byte-identical", () => {
    const md = "| Name | Qty |\n|:-----|----:|\n| apples   | 3 |\n\nPara text.\n";
    const ed = open(md);
    ed.el.querySelector("p")!.append(document.createTextNode(" More."));
    expect(ed.emit()).toBe("| Name | Qty |\n|:-----|----:|\n| apples   | 3 |\n\nPara text. More.\n");
    ed.unmount();
  });

  it("editing a table cell rewrites only that row, keeping the alignment row", () => {
    const md = "Before _x_.\n\n| Name | Qty |\n|:-----|----:|\n| apples   | 3 |\n| pears  | 10 |\n\nAfter.\n";
    const ed = open(md);
    const cell = ed.el.querySelectorAll("tbody td")[2]!; // "pears"
    cell.append(document.createTextNode("!"));
    expect(ed.emit()).toBe(
      "Before _x_.\n\n| Name | Qty |\n|:-----|----:|\n| apples   | 3 |\n| pears! | 10 |\n\nAfter.\n",
    );
    ed.unmount();
  });

  it("a table cell edit containing a pipe escapes it", () => {
    const md = "| a | b |\n|---|---|\n| 1 | 2 |\n";
    const ed = open(md);
    ed.el.querySelectorAll("tbody td")[0]!.replaceChildren(document.createTextNode("x | y"));
    expect(ed.emit()).toBe("| a | b |\n|---|---|\n| x \\| y | 2 |\n");
    ed.unmount();
  });

  it("editing the last block keeps the trailing newline", () => {
    const md = "Title\n=====\n\nLast para.\n";
    const ed = open(md);
    ed.el.querySelector("p")!.append(document.createTextNode(" Edited."));
    expect(ed.emit()).toBe("Title\n=====\n\nLast para. Edited.\n");
    ed.unmount();
  });

  it("editing one paragraph keeps setext headings, * bullets, _em_ and escapes elsewhere", () => {
    const md =
      "Title\n=====\n\n* keep _this_\n* and \\*this\\*\n\nEdit me.\n\n\nTrailing __strong__ para.\n";
    const ed = open(md);
    const ps = ed.el.querySelectorAll(":scope > p");
    ps[0]!.replaceChildren(document.createTextNode("Edited."));
    expect(ed.emit()).toBe(
      "Title\n=====\n\n* keep _this_\n* and \\*this\\*\n\nEdited.\n\n\nTrailing __strong__ para.\n",
    );
    ed.unmount();
  });

  it("Enter at the end of a paragraph adds a paragraph and keeps the original verbatim", () => {
    const md = "Keep _me_.\n\nNext.\n";
    const ed = open(md);
    const p = ed.el.querySelector("p")!;
    const fresh = enterAfter(p, "<br>");
    fresh.replaceChildren(document.createTextNode("Added."));
    expect(ed.emit()).toBe("Keep _me_.\n\nAdded.\n\nNext.\n");
    ed.unmount();
  });

  it("Enter in the middle of a paragraph splits it; neighbours stay verbatim", () => {
    const md = "* a\n\nHello world\n\n_after_\n";
    const ed = open(md);
    const p = ed.el.querySelector("p")!;
    p.replaceChildren(document.createTextNode("Hello"));
    enterAfter(p, " world");
    expect(ed.emit()).toBe("* a\n\nHello\n\n world\n\n_after_\n");
    ed.unmount();
  });

  it("Backspace joining two paragraphs leaves the rest verbatim", () => {
    const md = "* a\n\nAlpha\n\nBeta\n\n_after_\n";
    const ed = open(md);
    const ps = ed.el.querySelectorAll(":scope > p");
    ps[0]!.append(document.createTextNode("Beta"));
    ps[1]!.remove();
    expect(ed.emit()).toBe("* a\n\nAlphaBeta\n\n_after_\n");
    ed.unmount();
  });

  it("works with the default valueFormat (auto) for a note holding a table", () => {
    const md = "# Pricing\n\n| Plan | Seats |\n|:--|--:|\n| Pro | 10 |\n\nNotes _here_.\n";
    const changes: string[] = [];
    const view = mount(
      <Editor defaultValue={md} outputFormat="markdown" onChange={(v: string) => changes.push(v)}>
        <Editor.Content />
      </Editor>,
    );
    const el = view.content();
    act(() => {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(changes.at(-1)).toBe(md);
    el.querySelector("h1")!.append(document.createTextNode(" 2027"));
    act(() => {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(changes.at(-1)).toBe(md.replace("# Pricing", "# Pricing 2027"));
    view.unmount();
  });

  it("an item added to an ordered list continues the numbering and delimiter", () => {
    const md = "1) first\n2) second\n\nAfter.\n";
    const ed = open(md);
    const items = ed.el.querySelectorAll("li");
    enterAfter(items[1]!, "third");
    expect(ed.emit()).toBe("1) first\n2) second\n3) third\n\nAfter.\n");
    ed.unmount();
  });

  it("editing a header cell rewrites the header row and keeps the alignment row", () => {
    const md = "| Name | Qty |\n|:-----|----:|\n| apples   | 3 |\n";
    const ed = open(md);
    ed.el.querySelector("th")!.append(document.createTextNode("s"));
    expect(ed.emit()).toBe("| Names | Qty |\n|:-----|----:|\n| apples   | 3 |\n");
    ed.unmount();
  });

  it("a table with no source (pasted in) is serialised as a GFM table", () => {
    const md = "Intro.\n";
    const ed = open(md);
    const table = document.createElement("table");
    table.innerHTML =
      '<thead><tr><th style="text-align: center">A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2<br></td></tr></tbody>';
    ed.el.append(table);
    expect(ed.emit()).toBe("Intro.\n\n| A | B |\n| :---: | --- |\n| 1 | 2 |\n");
    ed.unmount();
  });

  it("html output carries no source-map attributes", () => {
    const changes: string[] = [];
    const view = mount(
      <Editor defaultValue={"| a | b |\n|---|---|\n| 1 | 2 |"} outputFormat="html" valueFormat="markdown" onChange={(v: string) => changes.push(v)}>
        <Editor.Content />
      </Editor>,
    );
    act(() => {
      view.content().dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(changes.at(-1)).toContain("<table");
    expect(changes.at(-1)).not.toContain("data-md-");
    view.unmount();
  });

  it("deleting a block keeps its neighbours and a reference definition", () => {
    const md = "See [docs][d].\n\nDelete me.\n\n[d]: https://example.com\n\n_end_\n";
    const ed = open(md);
    ed.el.querySelectorAll(":scope > p")[1]!.remove();
    const out = ed.emit();
    expect(out.startsWith("See [docs][d].\n\n")).toBe(true);
    expect(out).toContain("[d]: https://example.com");
    expect(out).not.toContain("Delete me.");
    expect(out.endsWith("_end_\n")).toBe(true);
    ed.unmount();
  });
});

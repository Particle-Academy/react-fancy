// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "../src/components/Editor/Editor";
import { htmlToMarkdown } from "../src/components/Editor/editor.utils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * An edit must change only what the person changed. A markdown document opened
 * in the Editor and edited in one place has to come back byte-identical
 * everywhere else.
 *
 * Reported by MOIC against 5.59.0: pressing Enter at the end of the LAST item
 * of a tight list and typing put a blank line after the FIRST item, which
 * turns the whole list loose in most renderers.
 */

const CALL_NOTES = [
  "# Call notes",
  "",
  "- The buyer wants a pilot first",
  "- Legal is waiting on redlines",
].join("\n");

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

/** What the Editor actually seeds into its contentEditable for `md`. */
function seededHtml(md: string): string {
  const view = mount(
    <Editor defaultValue={md} outputFormat="markdown">
      <Editor.Content />
    </Editor>,
  );
  const html = view.content().innerHTML;
  view.unmount();
  return html;
}

function emit(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const CORPUS: Record<string, string> = {
  "the reported call notes": CALL_NOTES,
  "a tight bullet list": "- one\n- two\n- three",
  "a loose bullet list": "- one\n\n- two\n\n- three",
  "a nested list": "- Parent\n  - Child one\n  - Child two\n- Sibling",
  "an ordered list": "1. First\n2. Second\n3. Third",
  "an ordered list that starts later": "3. Third\n4. Fourth",
  "a nested ordered list": "1. Step\n   - detail\n   - more detail\n2. Next step",
  headings: "# One\n\n## Two\n\n### Three\n\nBody text.",
  paragraphs: "First paragraph.\n\nSecond paragraph\nwith a soft break.",
  "a fenced code block": "Before.\n\n```js\nconst a = 1;\nconst b = a < 2 && true;\n```\n\nAfter.",
  "an unlabelled code block": "```\nplain\n  indented\n```",
  emphasis: "Some *em*, some **strong**, some `code` and ~~gone~~.",
  "a link": "See [the site](https://example.com/path) now.",
  "a blockquote": "> Quoted line.\n\nAfter the quote.",
  "a mixed document": [
    "# Plan",
    "",
    "Intro with **bold** text.",
    "",
    "- tight a",
    "- tight b",
    "",
    "1. ordered",
    "2. list",
    "",
    "```",
    "code",
    "```",
    "",
    "Closing line.",
  ].join("\n"),
};

describe("Editor markdown round trip — serialiser level", () => {
  for (const [name, md] of Object.entries(CORPUS)) {
    it(`markdown -> editor HTML -> markdown is byte-identical for ${name}`, () => {
      expect(htmlToMarkdown(seededHtml(md))).toBe(md);
    });
  }

  it("keeps a loose list loose (does not tighten it)", () => {
    const loose = "- one\n\n- two";
    expect(htmlToMarkdown(seededHtml(loose))).toBe(loose);
  });

  it("serialises the DOM Chromium leaves after Enter + typing on the last item", () => {
    // Real Chromium, Enter at the end of the last <li> then typing, produces a
    // new <li> as the IMMEDIATE sibling — no whitespace text node between it
    // and the previous one, unlike the newline-separated HTML marked emits.
    const html =
      "<h1>Call notes</h1>\n<ul>\n<li>The buyer wants a pilot first</li>\n" +
      "<li>Legal is waiting on redlines</li><li>Next call is Thursday</li>\n</ul>";
    expect(htmlToMarkdown(html)).toBe(`${CALL_NOTES}\n- Next call is Thursday`);
  });

  it("ignores the placeholder <br> Chromium puts in a freshly created item", () => {
    const html = "<ul>\n<li>one</li><li>two<br></li>\n</ul>";
    expect(htmlToMarkdown(html)).toBe("- one\n- two");
  });
});

describe("Editor markdown round trip — Editor level", () => {
  it("an input event with no edit emits the document unchanged", () => {
    const changes: string[] = [];
    const view = mount(
      <Editor defaultValue={CALL_NOTES} outputFormat="markdown" onChange={(v: string) => changes.push(v)}>
        <Editor.Toolbar />
        <Editor.Content />
      </Editor>,
    );
    emit(view.content());
    expect(changes.at(-1)).toBe(CALL_NOTES);
    view.unmount();
  });

  it("Enter at the end of the last list item + typing changes only the added line", () => {
    const changes: string[] = [];
    const view = mount(
      <Editor defaultValue={CALL_NOTES} outputFormat="markdown" onChange={(v: string) => changes.push(v)}>
        <Editor.Toolbar />
        <Editor.Content />
      </Editor>,
    );
    const el = view.content();
    const items = el.querySelectorAll("li");
    const last = items[items.length - 1]!;

    // jsdom implements neither contentEditable editing nor execCommand, so the
    // mutation Chromium performs is applied by hand, in the two steps the
    // browser emits input for: Enter (a new empty item holding a <br>), then
    // the typed text replacing that placeholder.
    const fresh = document.createElement("li");
    fresh.append(document.createElement("br"));
    last.after(fresh);
    emit(el);
    // Mid-edit, the untouched part of the document is already byte-identical.
    expect(changes.at(-1)!.startsWith(`${CALL_NOTES}\n-`)).toBe(true);

    fresh.replaceChildren(document.createTextNode("Next call is Thursday"));
    emit(el);
    expect(changes.at(-1)).toBe(`${CALL_NOTES}\n- Next call is Thursday`);
    view.unmount();
  });

  it("editing a loose list keeps it loose", () => {
    const loose = "- one\n\n- two";
    const changes: string[] = [];
    const view = mount(
      <Editor defaultValue={loose} outputFormat="markdown" onChange={(v: string) => changes.push(v)}>
        <Editor.Content />
      </Editor>,
    );
    const el = view.content();
    const firstP = el.querySelector("li p")!;
    firstP.append(document.createTextNode(" more"));
    emit(el);
    expect(changes.at(-1)).toBe("- one more\n\n- two");
    view.unmount();
  });
});

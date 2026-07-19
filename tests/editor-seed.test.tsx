// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "../src/components/Editor/Editor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
    content: () => host.querySelector<HTMLDivElement>('[contenteditable="true"]'),
  };
}

const noop = () => {};

describe("Editor — external value seeding (#15)", () => {
  it("shows a value that arrives after mount", () => {
    // The reported failure: content fetched asynchronously lands in `value`
    // after mount, and the contentEditable stayed blank forever.
    const view = mount(
      <Editor value="" onChange={noop} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    expect(view.content()?.innerHTML ?? "").toBe("");

    view.rerender(
      <Editor value="<p>Body</p>" onChange={noop} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );

    expect(view.content()?.innerHTML).toContain("Body");
    view.unmount();
  });

  it("still seeds from a value present at first mount", () => {
    const view = mount(
      <Editor value="<p>Present</p>" onChange={noop} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    expect(view.content()?.innerHTML).toContain("Present");
    view.unmount();
  });

  it("replaces the content when the host swaps the value again", () => {
    const view = mount(
      <Editor value="<p>First</p>" onChange={noop} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    view.rerender(
      <Editor value="<p>Second</p>" onChange={noop} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    const html = view.content()?.innerHTML ?? "";
    expect(html).toContain("Second");
    expect(html).not.toContain("First");
    view.unmount();
  });

  it("clears when the host resets the value to empty", () => {
    const view = mount(
      <Editor value="<p>Loaded</p>" onChange={noop} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    view.rerender(
      <Editor value="" onChange={noop} outputFormat="html">
        <Editor.Content />
      </Editor>,
    );
    expect(view.content()?.innerHTML ?? "").toBe("");
    view.unmount();
  });

  it("does NOT re-seed when the value echoes back from the user's own typing", () => {
    // The reason `value` was excluded from the seed deps in the first place:
    // re-seeding mid-keystroke rewrites innerHTML and destroys the caret. A
    // controlled host echoing our emitted value back must not trigger that.
    let current = "";
    const render = (v: string) =>
      (
        <Editor
          value={v}
          onChange={(next: string) => {
            current = next;
          }}
          outputFormat="html"
        >
          <Editor.Content />
        </Editor>
      ) as ReactElement;

    const view = mount(render(""));
    const el = view.content()!;

    // Simulate typing: the surface mutates its own DOM, then emits.
    el.innerHTML = "<p>typed</p>";
    act(() => {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(current).toContain("typed");

    // The host echoes that exact value back in.
    const node = { current: el.innerHTML };
    view.rerender(render(current));

    // Same DOM node, untouched — a re-seed would have rewritten innerHTML.
    expect(view.content()).toBe(el);
    expect(view.content()!.innerHTML).toBe(node.current);
    view.unmount();
  });

  it("seeds markdown values through the configured format", () => {
    const view = mount(
      <Editor value="" onChange={noop} outputFormat="markdown" valueFormat="markdown">
        <Editor.Content />
      </Editor>,
    );
    view.rerender(
      <Editor value="## Heading" onChange={noop} outputFormat="markdown" valueFormat="markdown">
        <Editor.Content />
      </Editor>,
    );
    expect(view.content()?.innerHTML).toContain("<h2");
    view.unmount();
  });
});

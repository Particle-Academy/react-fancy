// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useRef, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { MagicWand, type MagicWandAction } from "../src/components/MagicWand";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

const upper: MagicWandAction = { id: "upper", label: "Upper", run: (s) => s.toUpperCase() };

const action = (id: string) =>
  document.querySelector<HTMLButtonElement>(`[data-react-fancy-magic-wand-action="${id}"]`);

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

/**
 * Genie built its own buttons beside a textarea it owns, because MagicWand could
 * only act on the Textarea it renders itself. `target` lets it act on one it
 * does not own: a textarea / input by ref, or anything else (a code editor)
 * through a three-member adapter.
 */
describe("MagicWand — target", () => {
  it("acts on a textarea the host owns, and renders none of its own", async () => {
    let seen = "";
    function Host() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("hello world");
      seen = value;
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <MagicWand target={ref} value={value} onValueChange={setValue} actions={[upper]} />
        </>
      );
    }
    mount(<Host />);

    const textareas = document.querySelectorAll("textarea");
    expect(textareas.length).toBe(1);
    const ta = textareas[0]!;

    expect(action("upper")).toBeNull();
    act(() => {
      ta.setSelectionRange(6, 11);
      ta.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    expect(action("upper")).not.toBeNull();

    await click(action("upper")!);
    expect(seen).toBe("hello WORLD");
    expect(ta.value).toBe("hello WORLD");
    expect(action("upper")).toBeNull();
  });

  it("an adapter targets an editor that is not a textarea", async () => {
    let seen = "";
    let selection: { start: number; end: number } | null = null;
    function Host() {
      const ref = useRef<HTMLDivElement>(null);
      const [value, setValue] = useState("const answer = 42;");
      seen = value;
      return (
        <>
          <div ref={ref} data-editor="" contentEditable suppressContentEditableWarning>
            {value}
          </div>
          <MagicWand
            target={{ element: ref, getSelection: () => selection }}
            value={value}
            onValueChange={setValue}
            actions={[upper]}
          />
        </>
      );
    }
    mount(<Host />);
    const editor = document.querySelector<HTMLElement>("[data-editor]")!;

    act(() => {
      selection = { start: 6, end: 12 };
      editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    });
    await click(action("upper")!);
    expect(seen).toBe("const ANSWER = 42;");
  });

  it("a collapsed selection shows no wand", () => {
    function Host() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const [value, setValue] = useState("hello");
      return (
        <>
          <textarea ref={ref} value={value} onChange={(e) => setValue(e.target.value)} />
          <MagicWand target={ref} value={value} onValueChange={setValue} actions={[upper]} />
        </>
      );
    }
    mount(<Host />);
    const ta = document.querySelector("textarea")!;
    act(() => {
      ta.setSelectionRange(2, 2);
      ta.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    expect(action("upper")).toBeNull();
  });

  it("without target it still renders and acts on its own textarea (unchanged)", async () => {
    let seen = "";
    function Host() {
      const [value, setValue] = useState("abc def");
      seen = value;
      return <MagicWand value={value} onValueChange={setValue} actions={[upper]} />;
    }
    mount(<Host />);
    const ta = document.querySelector("textarea")!;
    act(() => {
      ta.setSelectionRange(0, 3);
      ta.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    await click(action("upper")!);
    expect(seen).toBe("ABC def");
  });
});

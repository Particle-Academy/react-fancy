// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CodeBlock } from "../src/components/CodeBlock";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A re-render of CodeBlock must not rewrite its code.
 *
 * React 19 re-applies `dangerouslySetInnerHTML` whenever the `{ __html }`
 * OBJECT changes, not only when the string does. CodeBlock built a fresh object
 * every render, so any parent re-render replaced the code's text nodes: a
 * selection inside the code (the person dragging over a command, or
 * SetupWizard's copy fallback selecting a value) collapsed to nothing, with no
 * error anywhere. Found building SetupWizard, 6.14.0.
 */

let root: Root | null = null;
let bump: () => void = () => {};

function Parent({ showLineNumbers }: { showLineNumbers?: boolean }) {
  const [n, setN] = useState(0);
  bump = () => setN((v) => v + 1);
  return (
    <div data-n={n}>
      <CodeBlock code={"npm install acme\nnpm test"} copyable={false} showLineNumbers={showLineNumbers} />
    </div>
  );
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("CodeBlock keeps its text nodes across a re-render", () => {
  it.each([
    ["plain", false, "[data-react-fancy-code-block-code]"],
    ["line numbers", true, "[data-react-fancy-code-block-line-content]"],
  ] as const)("%s", (_name, showLineNumbers, selector) => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root!.render(<Parent showLineNumbers={showLineNumbers} />));

    const el = host.querySelector(selector)!;
    const textBefore = el.firstChild;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    const selected = sel.getRangeAt(0).toString();
    expect(selected.length).toBeGreaterThan(0);

    act(() => bump());

    expect(host.querySelector("[data-n]")!.getAttribute("data-n")).toBe("1");
    expect(el.firstChild).toBe(textBefore);
    expect(sel.getRangeAt(0).toString()).toBe(selected);
  });
});

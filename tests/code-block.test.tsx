// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CodeBlock } from "../src/components/CodeBlock";
import { CodeBlock as FromBarrel } from "../src";
import { click, fakeClipboard, mount, removeClipboard } from "./content-renderer-helpers";

/**
 * CodeBlock: a display-only, syntax-highlighted, copyable code block (requested
 * by Prism for provider-setup pages, which must contain NO input element at all
 * because the site must never accept credentials).
 */

const INPUTS = "textarea, input, select, [contenteditable]";

function copyButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>("[data-react-fancy-code-block-copy]");
}

describe("CodeBlock", () => {
  it("is exported from the barrel", () => {
    expect(FromBarrel).toBe(CodeBlock);
  });

  it("renders <pre><code> with the code as text", () => {
    const { host } = mount(<CodeBlock code={"npm install\nnpm test"} />);
    const root = host.querySelector("[data-react-fancy-code-block]")!;
    expect(root).toBeTruthy();
    const code = root.querySelector("pre > code")!;
    expect(code).toBeTruthy();
    expect(code.textContent).toBe("npm install\nnpm test");
  });

  it("contains no input of any kind, with every option on", () => {
    const { host } = mount(
      <CodeBlock code={"<p>x</p>\n<b>y</b>"} language="html" title="index.html" showLineNumbers wrap />,
    );
    expect(copyButton(host)).toBeTruthy();
    expect(host.querySelectorAll(INPUTS)).toHaveLength(0);
  });

  it("contains no input when copyable is off either", () => {
    const { host } = mount(<CodeBlock code="x" copyable={false} />);
    expect(copyButton(host)).toBeNull();
    expect(host.querySelectorAll(INPUTS)).toHaveLength(0);
    expect(host.querySelectorAll("button")).toHaveLength(0);
  });

  it("makes the copy button a react-fancy Button with type, label and handle", () => {
    const { host } = mount(<CodeBlock code="x" />);
    const btn = copyButton(host)!;
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.hasAttribute("data-react-fancy-button")).toBe(true);
    expect(btn.getAttribute("type")).toBe("button");
    expect(btn.getAttribute("aria-label")).toBe("Copy code");
    expect(btn.getAttribute("data-copy-state")).toBe("idle");
  });

  it("copies the RAW code, not the highlighted HTML, and shows visible Copied feedback", async () => {
    const { writeText } = fakeClipboard();
    const code = '<a href="x">&amp;</a>\n\tindented';
    const { host } = mount(<CodeBlock code={code} language="html" />);
    await click(copyButton(host)!);
    expect(writeText).toHaveBeenCalledWith(code);
    const btn = copyButton(host)!;
    expect(btn.getAttribute("data-copy-state")).toBe("copied");
    expect(btn.getAttribute("aria-label")).toBe("Copied");
    expect(btn.textContent).toContain("Copied");
  });

  it("reports each copy through onCopyCode", async () => {
    fakeClipboard();
    const events: Array<{ text: string; ok: boolean }> = [];
    const { host } = mount(<CodeBlock code="echo hi" onCopyCode={(e) => events.push(e)} />);
    await click(copyButton(host)!);
    expect(events).toEqual([{ text: "echo hi", ok: true }]);
  });

  it("does not crash without a Clipboard API (insecure context) and says it failed", async () => {
    removeClipboard();
    const { host } = mount(<CodeBlock code="x" />);
    await click(copyButton(host)!);
    const btn = copyButton(host)!;
    expect(btn.getAttribute("data-copy-state")).toBe("failed");
    expect(btn.textContent).toContain("Copy failed");
  });

  it("says it failed when the clipboard write is refused", async () => {
    fakeClipboard({ writeTextFails: true });
    const { host } = mount(<CodeBlock code="x" />);
    await click(copyButton(host)!);
    expect(copyButton(host)!.getAttribute("data-copy-state")).toBe("failed");
  });

  it("highlights HTML with coloured token spans", () => {
    const { host } = mount(<CodeBlock code={'<div class="a">hi</div>'} language="html" />);
    const code = host.querySelector("pre code")!;
    expect(code.querySelectorAll("span[style*='color']").length).toBeGreaterThan(0);
    expect(code.textContent).toBe('<div class="a">hi</div>');
    expect(host.querySelector("[data-react-fancy-code-block]")!.getAttribute("data-language")).toBe("html");
  });

  // TypeScript, bash and JSON used to be in this list; since fancy-file-commons
  // 0.4 they highlight (see code-highlight-languages.test.tsx).
  it("renders languages with no highlighter as plain text", () => {
    for (const language of ["plaintext", "klingon", "sql", undefined]) {
      const { host } = mount(<CodeBlock code={"const a = 1;"} language={language} />);
      const code = host.querySelector("pre code")!;
      expect(code.querySelectorAll("span").length).toBe(0);
      expect(code.textContent).toBe("const a = 1;");
      host.remove();
    }
  });

  it("renders <script> in code as text, never as an element", () => {
    const evil = "<script>window.__pwned = 1</script><img src=x onerror=alert(1)>";
    for (const language of ["html", "plaintext"]) {
      const { host } = mount(<CodeBlock code={evil} language={language} showLineNumbers={language === "html"} />);
      expect(host.querySelector("script")).toBeNull();
      expect(host.querySelector("img")).toBeNull();
      const text = language === "html"
        ? Array.from(host.querySelectorAll("[data-react-fancy-code-block-line-content]")).map((l) => l.textContent).join("\n")
        : host.querySelector("pre code")!.textContent;
      expect(text).toBe(evil);
      host.remove();
    }
    expect((window as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it("renders a title header", () => {
    const { host } = mount(<CodeBlock code="X=1" title=".env" />);
    const title = host.querySelector("[data-react-fancy-code-block-title]")!;
    expect(title.textContent).toBe(".env");
  });

  it("renders line numbers outside the code text, even when a token spans lines", () => {
    const code = "<!-- one\ntwo -->\n<p>three</p>";
    const { host } = mount(<CodeBlock code={code} language="html" showLineNumbers />);
    const numbers = Array.from(host.querySelectorAll("[data-react-fancy-code-block-line-number]"));
    expect(numbers.map((n) => n.textContent)).toEqual(["1", "2", "3"]);
    expect(numbers.every((n) => n.getAttribute("aria-hidden") === "true")).toBe(true);
    const lines = Array.from(host.querySelectorAll("[data-react-fancy-code-block-line-content]"));
    expect(lines.map((l) => l.textContent)).toEqual(["<!-- one", "two -->", "<p>three</p>"]);
    // The comment's second line is still coloured as a comment.
    expect(lines[1].querySelector("span[style*='italic']")).toBeTruthy();
  });

  it("does not wrap by default, and wraps with wrap", () => {
    const a = mount(<CodeBlock code="x" />);
    const preA = a.host.querySelector("pre")!;
    expect(preA.style.whiteSpace).toBe("pre");
    expect(a.host.querySelector("[data-react-fancy-code-block]")!.getAttribute("data-wrap")).toBe("false");
    const b = mount(<CodeBlock code="x" wrap />);
    expect(b.host.querySelector("pre")!.style.whiteSpace).toBe("pre-wrap");
  });

  it("uses CodeView's light palette by default and its dark palette under .dark", () => {
    // jsdom has no matchMedia: the block must still render (a consumer's tests
    // run here too), falling back to the `.dark` class signal alone.
    expect(typeof window.matchMedia).not.toBe("function");
    const light = mount(<CodeBlock code="x" />);
    const lightRoot = light.host.querySelector<HTMLElement>("[data-react-fancy-code-block]")!;
    expect(lightRoot.style.backgroundColor).toBe("rgb(255, 255, 255)");
    document.documentElement.classList.add("dark");
    try {
      const dark = mount(<CodeBlock code="x" />);
      const darkRoot = dark.host.querySelector<HTMLElement>("[data-react-fancy-code-block]")!;
      expect(darkRoot.style.backgroundColor).toBe("rgb(24, 24, 27)");
    } finally {
      document.documentElement.classList.remove("dark");
    }
  });

  it("forwards root attributes and merges className", () => {
    const { host } = mount(
      <CodeBlock code="x" id="setup" aria-label="Setup command" data-step="2" className="my-4" />,
    );
    const root = host.querySelector("[data-react-fancy-code-block]")!;
    expect(root.id).toBe("setup");
    expect(root.getAttribute("aria-label")).toBe("Setup command");
    expect(root.getAttribute("data-step")).toBe("2");
    expect(root.className).toContain("my-4");
  });
});

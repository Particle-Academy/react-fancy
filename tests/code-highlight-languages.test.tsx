// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CodeBlock } from "../src/components/CodeBlock";
import { CodeView } from "../src/components/CodeView";
import { mount } from "./content-renderer-helpers";

/**
 * CodeBlock and CodeView highlight every language fancy-file-commons ships,
 * through its `tokenize(code, language)` lookup, and keep rendering code as
 * text, never markup, in every one of them.
 */

const SAMPLES: Record<string, string> = {
  ts: "const n: number = add(1, 2); // sum",
  tsx: "export function App() { return null; }",
  typescript: "interface A { b: string }",
  js: "let s = 'x' + `y`;",
  javascript: "if (a) { return 1; }",
  json: '{"name": "fancy", "n": 1, "ok": true}',
  php: '<?php echo $name; ?>',
  py: "def f(x):\n    return 'y'  # c",
  python: "import os",
  go: 'func main() { fmt.Println("hi") }',
  md: "# Title\n\nSome `code` and **bold**.",
  markdown: "- item",
  sh: "npm install --save-dev x # deps",
  bash: 'echo "hi $USER" && ls -la',
  shell: "export PATH=$HOME/bin:$PATH",
  env: "# db\nDB_HOST=localhost\nexport KEY=\"${A}\"",
  dotenv: "APP_NAME=Fancy",
  html: '<div class="a">hi</div>',
  xml: '<?xml version="1.0"?><a b="c"/>',
};

const UNKNOWN = ["plaintext", "klingon", "", undefined, "constructor", "__proto__"];

const EVIL = "</script><script>window.__pwned = 1</script><img src=x onerror=alert(1)>\n\"$X\" ${Y} 'z' `w` # <b>";

function codeText(host: HTMLElement, lineNumbers: boolean): string {
  if (lineNumbers) {
    return Array.from(host.querySelectorAll("[data-react-fancy-code-block-line-content]"))
      .map((l) => l.textContent)
      .join("\n");
  }
  return host.querySelector("pre code")!.textContent ?? "";
}

describe("CodeBlock highlights every shipped language", () => {
  for (const [language, code] of Object.entries(SAMPLES)) {
    it(`${language}: coloured spans, exact text`, () => {
      const { host } = mount(<CodeBlock code={code} language={language} />);
      const el = host.querySelector("pre code")!;
      expect(el.querySelectorAll("span[style*='color']").length).toBeGreaterThan(0);
      expect(el.textContent).toBe(code);
      expect(host.querySelector("[data-react-fancy-code-block]")!.getAttribute("data-language")).toBe(language);
      host.remove();
    });

    it(`${language}: line-numbered text is exact too`, () => {
      const { host } = mount(<CodeBlock code={code} language={language} showLineNumbers />);
      expect(codeText(host, true)).toBe(code);
      host.remove();
    });
  }

  it("is case-insensitive about the language id", () => {
    const { host } = mount(<CodeBlock code="echo hi" language="BASH" />);
    expect(host.querySelectorAll("pre code span[style*='color']").length).toBeGreaterThan(0);
    host.remove();
  });

  it("renders unknown languages as plain text", () => {
    for (const language of UNKNOWN) {
      const { host } = mount(<CodeBlock code={"const a = 1;"} language={language} />);
      const el = host.querySelector("pre code")!;
      expect(el.querySelectorAll("span").length).toBe(0);
      expect(el.textContent).toBe("const a = 1;");
      host.remove();
    }
  });
});

describe("the escaping guarantee holds in every language", () => {
  for (const language of [...Object.keys(SAMPLES), "plaintext"]) {
    for (const lineNumbers of [false, true]) {
      it(`CodeBlock ${language}${lineNumbers ? " (line numbers)" : ""}: <script> stays text`, () => {
        const { host } = mount(<CodeBlock code={EVIL} language={language} showLineNumbers={lineNumbers} />);
        expect(host.querySelector("script")).toBeNull();
        expect(host.querySelector("img")).toBeNull();
        expect(host.querySelector("pre b")).toBeNull();
        expect(codeText(host, lineNumbers)).toBe(EVIL);
        host.remove();
      });
    }

    it(`CodeView ${language}: <script> stays text`, () => {
      const { host } = mount(<CodeView value={EVIL} language={language} readOnly />);
      const overlay = host.querySelector("pre code")!;
      expect(host.querySelector("script")).toBeNull();
      expect(host.querySelector("img")).toBeNull();
      expect(overlay.querySelector("b")).toBeNull();
      expect(overlay.textContent).toBe(EVIL + "\n");
      host.remove();
    });
  }
  it("never executed anything", () => {
    expect((window as { __pwned?: number }).__pwned).toBeUndefined();
  });
});

describe("CodeView highlights every shipped language", () => {
  for (const [language, code] of Object.entries(SAMPLES)) {
    it(`${language}: coloured spans in the overlay, exact text`, () => {
      const { host } = mount(<CodeView value={code} language={language} readOnly />);
      const overlay = host.querySelector("pre code")!;
      expect(overlay.querySelectorAll("span[style*='color']").length).toBeGreaterThan(0);
      expect(overlay.textContent).toBe(code + "\n");
      host.remove();
    });
  }

  it("renders unknown languages as plain text", () => {
    for (const language of UNKNOWN) {
      const { host } = mount(<CodeView value="const a = 1;" language={language} readOnly />);
      const overlay = host.querySelector("pre code")!;
      expect(overlay.querySelectorAll("span").length).toBe(0);
      host.remove();
    }
  });
});

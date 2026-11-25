// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  ContentRenderer,
  type ContentFenceProps,
  type RenderExtension,
} from "../src/components/ContentRenderer";
import { copyButtons, mount } from "./content-renderer-helpers";

/**
 * Per-language code-fence renderers (CC-fancy-0060).
 *
 * `fences={{ mermaid: Diagram }}` renders a ```mermaid block with the host's
 * component instead of a code block. The hook is generic and carries no diagram
 * code: what a language means is entirely the host's. Without `fences`, and for
 * every language not in it, a fence renders exactly as it did before.
 */

function recorder(seen: ContentFenceProps[]) {
  return function Diagram(props: ContentFenceProps) {
    seen.push(props);
    return <figure data-diagram={props.language}>{props.code}</figure>;
  };
}

const MERMAID = "flowchart LR\n  A --> B";
const doc = (lang: string, body = MERMAID, fence = "```") => `Before\n\n${fence}${lang}\n${body}\n${fence}\n\nAfter`;

describe("without a fences prop", () => {
  it("a ```mermaid block still renders as a plain code block", () => {
    const { host } = mount(<ContentRenderer value={doc("mermaid")} format="markdown" />);
    const code = host.querySelector("pre code")!;
    expect(code).toBeTruthy();
    expect(code.textContent).toBe(`${MERMAID}\n`);
    expect(code.className).toContain("language-mermaid");
    expect(host.querySelector("[data-render-fence]")).toBeNull();
    // ...with its copy button, exactly as any code block.
    expect(copyButtons(host, "code")).toHaveLength(1);
  });

  it("an empty fences object changes nothing either", () => {
    const { host } = mount(<ContentRenderer value={doc("mermaid")} format="markdown" fences={{}} />);
    expect(host.querySelector("pre code")!.textContent).toBe(`${MERMAID}\n`);
    expect(host.querySelector("[data-render-fence]")).toBeNull();
  });
});

describe("with a fence renderer", () => {
  it("renders the block with the host's component, and the prose around it as before", () => {
    const seen: ContentFenceProps[] = [];
    const { host } = mount(
      <ContentRenderer value={doc("mermaid")} format="markdown" fences={{ mermaid: recorder(seen) }} />,
    );
    expect(seen.at(-1)).toEqual({ code: MERMAID, language: "mermaid", info: "mermaid" });
    const wrapper = host.querySelector("[data-render-fence='mermaid']")!;
    expect(wrapper.querySelector("figure[data-diagram='mermaid']")!.textContent).toBe(MERMAID);
    expect(host.querySelector("pre")).toBeNull();
    const paragraphs = Array.from(host.querySelectorAll("p")).map((p) => p.textContent);
    expect(paragraphs).toEqual(["Before", "After"]);
  });

  it("hands over the code exactly: no trailing newline, inner blank lines and indentation kept", () => {
    const seen: ContentFenceProps[] = [];
    const body = "flowchart TB\n\n  A --> B\n    B --> C";
    mount(<ContentRenderer value={doc("mermaid", body)} format="markdown" fences={{ mermaid: recorder(seen) }} />);
    expect(seen.at(-1)!.code).toBe(body);
  });

  it("matches the language case-insensitively, on the first word of the info string", () => {
    const seen: ContentFenceProps[] = [];
    mount(
      <ContentRenderer
        value={doc('Mermaid title="Flow"')}
        format="markdown"
        fences={{ mermaid: recorder(seen) }}
      />,
    );
    expect(seen.at(-1)).toMatchObject({ language: "mermaid", info: 'Mermaid title="Flow"' });
  });

  it("accepts a key in any case", () => {
    const seen: ContentFenceProps[] = [];
    mount(<ContentRenderer value={doc("mermaid")} format="markdown" fences={{ Mermaid: recorder(seen) }} />);
    expect(seen).toHaveLength(1);
  });

  it("reads tilde fences and fences indented up to three spaces", () => {
    const seen: ContentFenceProps[] = [];
    const value = "~~~mermaid\nA --> B\n~~~\n\n   ```mermaid\n   C --> D\n   ```";
    mount(<ContentRenderer value={value} format="markdown" fences={{ mermaid: recorder(seen) }} />);
    expect(seen.map((s) => s.code)).toEqual(["A --> B", "C --> D"]);
  });

  it("leaves every other language as a code block, copy button included", () => {
    const seen: ContentFenceProps[] = [];
    const value = "```js\nconst a = 1;\n```\n\n```mermaid\nA --> B\n```";
    const { host } = mount(<ContentRenderer value={value} format="markdown" fences={{ mermaid: recorder(seen) }} />);
    expect(host.querySelector("pre code")!.textContent).toBe("const a = 1;\n");
    expect(copyButtons(host, "code")).toHaveLength(1);
    expect(seen).toHaveLength(1);
  });

  it("does not lift a fence that sits inside a longer one", () => {
    const seen: ContentFenceProps[] = [];
    const value = "````md\n```mermaid\nA --> B\n```\n````";
    const { host } = mount(<ContentRenderer value={value} format="markdown" fences={{ mermaid: recorder(seen) }} />);
    expect(seen).toHaveLength(0);
    expect(host.querySelector("pre code")!.textContent).toContain("```mermaid");
  });

  it("does not lift indented code, an unclosed fence, or a fence in a blockquote", () => {
    const seen: ContentFenceProps[] = [];
    for (const value of ["    ```mermaid\n    A --> B\n    ```", "```mermaid\nA --> B", "> ```mermaid\n> A --> B\n> ```"]) {
      mount(<ContentRenderer value={value} format="markdown" fences={{ mermaid: recorder(seen) }} />);
    }
    expect(seen).toHaveLength(0);
  });

  it("is a markdown feature: HTML content is untouched", () => {
    const seen: ContentFenceProps[] = [];
    const { host } = mount(
      <ContentRenderer
        value={'<pre><code class="language-mermaid">A --&gt; B</code></pre>'}
        format="html"
        fences={{ mermaid: recorder(seen) }}
      />,
    );
    expect(seen).toHaveLength(0);
    expect(host.querySelector("pre code")!.textContent).toBe("A --> B");
  });

  it("works inside a markdown-body extension", () => {
    const seen: ContentFenceProps[] = [];
    const result: RenderExtension = {
      tag: "result",
      markdown: true,
      component: (p) => <section data-card="">{p.children}</section>,
    };
    const { host } = mount(
      <ContentRenderer
        value={"<result>\n```mermaid\nA --> B\n```\n</result>"}
        format="markdown"
        extensions={[result]}
        fences={{ mermaid: recorder(seen) }}
      />,
    );
    expect(seen.at(-1)!.code).toBe("A --> B");
    expect(host.querySelector("[data-card] [data-render-fence='mermaid']")).toBeTruthy();
  });

  it("hands the code to the component as a string; the renderer never injects it", () => {
    const seen: ContentFenceProps[] = [];
    const body = 'A["<img src=x onerror=alert(1)>"] --> B["<script>window.__p=1</script>"]';
    const { host } = mount(
      <ContentRenderer value={doc("mermaid", body)} format="markdown" fences={{ mermaid: recorder(seen) }} />,
    );
    expect(seen.at(-1)!.code).toBe(body);
    expect(host.querySelector("img")).toBeNull();
    expect(host.querySelector("script")).toBeNull();
  });
});

describe("while streaming", () => {
  const fences = (seen: ContentFenceProps[]) => ({ mermaid: recorder(seen) });

  it("holds an open fence back, then renders it once it closes", () => {
    const seen: ContentFenceProps[] = [];
    const open = "Intro\n\n```mermaid\nA --> B";
    const { host, rerender } = mount(
      <ContentRenderer value={open} format="markdown" streaming fences={fences(seen)} />,
    );
    expect(seen).toHaveLength(0);
    expect(host.textContent).not.toContain("A --> B");
    rerender(<ContentRenderer value={`${open}\n\`\`\``} format="markdown" streaming fences={fences(seen)} />);
    expect(seen.at(-1)!.code).toBe("A --> B");
  });

  it("progressive: an open fence shows as plain code while it fills, and the component only once it closes", () => {
    const seen: ContentFenceProps[] = [];
    const open = "```mermaid\nflowchart LR\n  A --> B";
    const { host, rerender } = mount(
      <ContentRenderer value={open} format="markdown" streaming="progressive" fences={fences(seen)} />,
    );
    expect(seen).toHaveLength(0);
    expect(host.querySelector("pre code")!.textContent).toContain("A --> B");
    rerender(
      <ContentRenderer value={`${open}\n\`\`\`\n`} format="markdown" streaming="progressive" fences={fences(seen)} />,
    );
    expect(seen.at(-1)!.code).toBe("flowchart LR\n  A --> B");
    expect(host.querySelector("pre")).toBeNull();
  });

  it("progressive: a closed fence before an open one renders, the open one stays code", () => {
    const seen: ContentFenceProps[] = [];
    const value = "```mermaid\nA --> B\n```\n\n```mermaid\nC --> D";
    const { host } = mount(
      <ContentRenderer value={value} format="markdown" streaming="progressive" fences={fences(seen)} />,
    );
    expect(seen.map((s) => s.code)).toEqual(["A --> B"]);
    expect(host.querySelector("pre code")!.textContent).toContain("C --> D");
  });
});

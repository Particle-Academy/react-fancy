// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  ContentRenderer,
  type RenderExtension,
  type RenderExtensionProps,
} from "../src/components/ContentRenderer";
import { copyButtons, mount } from "./content-renderer-helpers";

/**
 * Custom tags with a MARKDOWN body (genie#1263).
 *
 * ContentRenderer used to find custom tags only after the markdown had become
 * HTML, and a CommonMark HTML block swallows the markdown inside it, so
 * `<result>**bold**</result>` reached the extension as literal asterisks. Genie
 * worked around it by splitting replies itself. An extension marked
 * `markdown: true` is now lifted out of the source BEFORE conversion.
 */

function card(seen?: RenderExtensionProps[]) {
  return function Card(props: RenderExtensionProps) {
    seen?.push(props);
    return (
      <section data-card={props.attributes.title ?? ""}>
        {props.children}
      </section>
    );
  };
}

const result = (seen?: RenderExtensionProps[]): RenderExtension => ({
  tag: "result",
  markdown: true,
  component: card(seen),
});

describe("ContentRenderer markdown-body extensions", () => {
  it("hands the component its raw markdown body and the rendered markdown as children", () => {
    const seen: RenderExtensionProps[] = [];
    const md = "Before\n\n<result title=\"Done\">\n**bold** and `code`\n\n- a\n- b\n</result>\n\nAfter *x*";
    const { host } = mount(<ContentRenderer value={md} format="markdown" extensions={[result(seen)]} />);
    expect(seen.at(-1)!.content).toBe("\n**bold** and `code`\n\n- a\n- b\n");
    expect(seen.at(-1)!.attributes).toEqual({ title: "Done" });
    const sec = host.querySelector("[data-card='Done']")!;
    expect(sec.querySelector("strong")!.textContent).toBe("bold");
    expect(sec.querySelectorAll("li")).toHaveLength(2);
    expect(sec.closest("[data-render-extension='result']")).toBeTruthy();
    expect(host.textContent).toContain("Before");
    expect(host.querySelector("em")!.textContent).toBe("x");
    expect(host.textContent).not.toContain("<result");
  });

  it("works in auto format too", () => {
    const { host } = mount(<ContentRenderer value={"<result>\n**b**\n</result>"} extensions={[result()]} />);
    expect(host.querySelector("[data-card] strong")!.textContent).toBe("b");
  });

  it("still sanitises the markdown body", () => {
    const md =
      "<result>\n<img src=x onerror=\"alert(1)\"> [x](javascript:alert(1)) <script>window.__pwned = 1</script>\n\n<iframe src=\"https://x.test\"></iframe>\n</result>";
    const { host } = mount(<ContentRenderer value={md} format="markdown" extensions={[result()]} />);
    const sec = host.querySelector("[data-card]")!;
    expect(sec.querySelector("img")).toBeTruthy();
    expect(sec.innerHTML).not.toContain("onerror");
    expect(sec.innerHTML).not.toContain("javascript:");
    expect(sec.querySelector("script, iframe")).toBeNull();
  });

  it("strips dangerous attributes from the tag before the component sees them", () => {
    const seen: RenderExtensionProps[] = [];
    const md = "<result title=\"t\" onclick=\"bad()\" href=\"javascript:bad()\" data-id=\"7\">\nok\n</result>";
    mount(<ContentRenderer value={md} format="markdown" extensions={[result(seen)]} />);
    expect(seen.at(-1)!.attributes).toEqual({ title: "t", "data-id": "7" });
  });

  it("renders nested markdown tags inside one another", () => {
    const detail: RenderExtension = {
      tag: "detail",
      markdown: true,
      component: ({ children }) => <aside data-detail="">{children}</aside>,
    };
    const md = "<result>\nouter\n\n<detail>\n*inner*\n</detail>\n</result>";
    const { host } = mount(<ContentRenderer value={md} format="markdown" extensions={[result(), detail]} />);
    expect(host.querySelector("[data-card] [data-detail] em")!.textContent).toBe("inner");
  });

  it("matches the right closing tag when a tag nests inside itself", () => {
    const md = "<result title=\"o\">\na\n\n<result title=\"i\">\nb\n</result>\n\nc\n</result>\n\ntail";
    const { host } = mount(<ContentRenderer value={md} format="markdown" extensions={[result()]} />);
    const outer = host.querySelector("[data-card='o']")!;
    expect(outer.querySelector("[data-card='i']")!.textContent).toContain("b");
    expect(outer.textContent).toContain("c");
    expect(outer.textContent).not.toContain("tail");
  });

  it("leaves a tag inside a fenced code block alone", () => {
    const fn = vi.fn();
    const ext: RenderExtension = { tag: "result", markdown: true, component: () => { fn(); return null; } };
    const md = "```\n<result>\n**x**\n</result>\n```";
    const { host } = mount(<ContentRenderer value={md} format="markdown" extensions={[ext]} />);
    expect(fn).not.toHaveBeenCalled();
    expect(host.querySelector("pre code")!.textContent).toContain("<result>");
  });

  it("keeps unknown tags inert and sanitised", () => {
    const md = "<bogus onclick=\"bad()\">**hi**</bogus>\n\n<result>\n<bogus onmouseover=\"bad()\">x</bogus>\n</result>";
    const { host } = mount(<ContentRenderer value={md} format="markdown" extensions={[result()]} />);
    expect(host.innerHTML).not.toContain("onclick");
    expect(host.innerHTML).not.toContain("onmouseover");
    expect(host.querySelector("[data-card] bogus")!.textContent).toBe("x");
  });

  it("still renders an unclosed tag, sanitised, when nothing more is coming", () => {
    const md = "<result>\n**x** <img src=x onerror=\"bad()\">";
    const { host } = mount(<ContentRenderer value={md} format="markdown" extensions={[result()]} />);
    // The HTML parser closes the tag at the end, as it always has, so the
    // remainder becomes the body. What matters: the body is shown, as children,
    // and nothing in it escaped the sanitiser.
    expect(host.querySelector("[data-card]")!.textContent).toContain("x");
    expect(host.textContent).not.toContain("<result");
    expect(host.innerHTML).not.toContain("onerror");
  });

  it("gives code inside a markdown body its copy button", () => {
    const { host } = mount(
      <ContentRenderer value={"<result>\n```\nx\n```\n</result>"} format="markdown" extensions={[result()]} />,
    );
    expect(copyButtons(host, "code")).toHaveLength(1);
  });

  it("does not change extensions that are not marked markdown", () => {
    const seen: RenderExtensionProps[] = [];
    const thinking: RenderExtension = {
      tag: "thinking",
      component: (p) => { seen.push(p); return <i data-thinking="">{p.content}</i>; },
    };
    mount(<ContentRenderer value={"<thinking><b>raw</b></thinking><p>answer</p>"} extensions={[thinking]} />);
    expect(seen.at(-1)!.content).toBe("<b>raw</b>");
    expect(seen.at(-1)!.children).toBeUndefined();
  });
});

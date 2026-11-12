// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import path from "node:path";

import { SkipLink } from "../src/components/SkipLink";
import { SkipLink as FromBarrel } from "../src";
import { flatten, resolveVars } from "./rendered-css";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * SkipLink (WCAG 2.4.1 Bypass Blocks): the first thing in the tab order, hidden
 * until it is focused, and on activation it moves focus to the page's main
 * content, so a keyboard user does not tab through the whole header first.
 *
 * Its hidden and focused looks ship in styles.css, keyed on its handle, not as
 * Tailwind classes: a consumer that has not @sourced the kit gets no generated
 * utilities, and a skip link whose `sr-only` never compiled is a stray link
 * sitting visibly at the top of every page.
 */

let root: Root | null = null;
let sheet: HTMLStyleElement | null = null;

function mount(el: React.ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return host;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  sheet?.remove();
  sheet = null;
  document.body.innerHTML = "";
});

function installKitCss() {
  const css = readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8");
  sheet = document.createElement("style");
  sheet.textContent = flatten(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  document.head.append(sheet);
}

const link = () => document.querySelector<HTMLAnchorElement>("[data-skip-link]")!;

function main(attrs: Record<string, string> = {}) {
  const el = document.createElement("main");
  el.id = attrs.id ?? "main";
  for (const [k, v] of Object.entries(attrs)) if (k !== "id") el.setAttribute(k, v);
  el.textContent = "content";
  document.body.append(el);
  return el;
}

function activate(a: HTMLAnchorElement): MouseEvent {
  const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
  act(() => {
    a.dispatchEvent(ev);
  });
  return ev;
}

describe("SkipLink markup", () => {
  it("is a link to #main, labelled 'Skip to content', with both stable handles", () => {
    mount(<SkipLink />);
    const a = link();
    expect(a.tagName).toBe("A");
    expect(a.getAttribute("href")).toBe("#main");
    expect(a.textContent).toBe("Skip to content");
    expect(a.hasAttribute("data-skip-link")).toBe(true);
    expect(a.hasAttribute("data-react-fancy-skip-link")).toBe(true);
  });

  it("takes its label", () => {
    mount(<SkipLink label="Zum Inhalt springen" />);
    expect(link().textContent).toBe("Zum Inhalt springen");
  });

  it("takes a targetId", () => {
    mount(<SkipLink targetId="content" />);
    expect(link().getAttribute("href")).toBe("#content");
  });

  it("takes an href, which wins over targetId", () => {
    mount(<SkipLink href="#article" targetId="content" />);
    expect(link().getAttribute("href")).toBe("#article");
  });

  it("forwards rest props, className and a ref", () => {
    const ref = createRef<HTMLAnchorElement>();
    mount(<SkipLink ref={ref} className="my-skip" data-pw="skip" id="skip" />);
    const a = link();
    expect(ref.current).toBe(a);
    expect(a.classList.contains("my-skip")).toBe(true);
    expect(a.getAttribute("data-pw")).toBe("skip");
    expect(a.id).toBe("skip");
  });

  it("is exported from the barrel", () => {
    expect(FromBarrel).toBe(SkipLink);
  });
});

describe("SkipLink activation moves focus to the target", () => {
  it("focuses a target that is not focusable, giving it tabIndex=-1", () => {
    const target = main();
    mount(<SkipLink />);
    expect(target.hasAttribute("tabindex")).toBe(false);
    activate(link());
    expect(target.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(target);
  });

  it("keeps a tabindex the target already has", () => {
    const target = main({ tabindex: "0" });
    mount(<SkipLink />);
    activate(link());
    expect(target.getAttribute("tabindex")).toBe("0");
    expect(document.activeElement).toBe(target);
  });

  it("does not take a natively focusable target out of the tab order", () => {
    const button = document.createElement("button");
    button.id = "main";
    document.body.append(button);
    mount(<SkipLink />);
    activate(link());
    expect(button.hasAttribute("tabindex")).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("follows a custom targetId", () => {
    const target = main({ id: "content" });
    mount(<SkipLink targetId="content" />);
    activate(link());
    expect(document.activeElement).toBe(target);
  });

  it("handles the click itself, so a hash router never sees the fragment", () => {
    main();
    mount(<SkipLink />);
    expect(activate(link()).defaultPrevented).toBe(true);
  });

  it("with no such target, leaves the browser's own fragment navigation alone", () => {
    mount(<SkipLink targetId="nowhere" />);
    expect(activate(link()).defaultPrevented).toBe(false);
  });

  it("still calls a consumer onClick", () => {
    main();
    let clicked = 0;
    mount(<SkipLink onClick={() => clicked++} />);
    activate(link());
    expect(clicked).toBe(1);
  });
});

describe("SkipLink is hidden until focused (styles.css)", () => {
  it("unfocused: visually hidden, still in the accessibility tree", () => {
    installKitCss();
    mount(<SkipLink />);
    const cs = getComputedStyle(link());
    expect(cs.position).toBe("absolute");
    expect(cs.width).toBe("1px");
    expect(cs.height).toBe("1px");
    expect(cs.overflow).toBe("hidden");
    expect(cs.clipPath || cs.clip).toMatch(/inset\(50%\)|rect\(0/);
    // Not display:none / visibility:hidden, which would also hide it from a
    // screen reader and from the tab order.
    expect(cs.display).not.toBe("none");
    expect(cs.visibility).not.toBe("hidden");
  });

  it("focused: visible, on top, painted with the theme tokens", () => {
    installKitCss();
    document.documentElement.style.setProperty("--fancy-surface", "rgb(1, 2, 3)");
    document.documentElement.style.setProperty("--fancy-text", "rgb(4, 5, 6)");
    mount(<SkipLink />);
    const a = link();
    act(() => a.focus());
    expect(document.activeElement).toBe(a);
    const cs = getComputedStyle(a);
    expect(cs.position).toBe("fixed");
    expect(cs.width).not.toBe("1px");
    expect(cs.clipPath === "" || cs.clipPath === "none").toBe(true);
    expect(Number(cs.zIndex)).toBeGreaterThanOrEqual(50);
    expect(resolveVars(a, cs.backgroundColor)).toBe("rgb(1, 2, 3)");
    expect(resolveVars(a, cs.color)).toBe("rgb(4, 5, 6)");
    document.documentElement.style.removeProperty("--fancy-surface");
    document.documentElement.style.removeProperty("--fancy-text");
  });
  // Layering (so a consumer className wins) is asserted for every
  // `[data-react-fancy-*]` rule by styles-layering.test.ts.
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { ContentReaction, type ContentReactionItem } from "../src/components/ContentReaction";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Lab finding K19: with two or more counts showing, the trigger failed axe
 * `label-content-name-mismatch` (serious, WCAG 2.5.3 Label in Name). The visible
 * text was "18 7 4" and the accessible name "React: Like 18, Insightful 7, Love 4",
 * so a speech-input user saying what they SEE ("click 18 7 4") matched nothing.
 * One count passed only by luck: "Like 18" happens to contain "18".
 *
 * The check below is axe's: the visible text of the button (aria-hidden subtrees
 * excluded, text nodes joined by a space), with emoji and punctuation removed from
 * both sides, must be a substring of the accessible name.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const REACTIONS: ContentReactionItem[] = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "insightful", emoji: "💡", label: "Insightful" },
  { key: "love", emoji: "❤️", label: "Love" },
];

const trigger = () => document.querySelector<HTMLButtonElement>("[data-react-fancy-content-reaction-trigger]")!;

/** Visible text the way axe collects it: leaf text, aria-hidden excluded, joined by spaces. */
function visibleText(el: Element): string {
  const parts: string[] = [];
  (function walk(node: Node) {
    if (node.nodeType === 3) {
      const t = node.textContent?.trim();
      if (t) parts.push(t);
      return;
    }
    if (node instanceof Element && node.getAttribute("aria-hidden") === "true") return;
    node.childNodes.forEach(walk);
  })(el);
  return parts.join(" ");
}

/** axe's curation: no emoji, no punctuation, collapsed whitespace, lower case. */
function curate(s: string): string {
  return s
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u{FE0F}/gu, "")
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function expectLabelInName(el: HTMLElement) {
  const visible = curate(visibleText(el));
  const name = curate(el.getAttribute("aria-label") ?? visibleText(el));
  // Guard on the guard: there is visible text to find, so the check is real.
  expect(visible.length).toBeGreaterThan(0);
  expect(name, `visible "${visible}" in name "${name}"`).toContain(visible);
}

describe("ContentReaction trigger: the accessible name contains the visible text (K19, WCAG 2.5.3)", () => {
  it("with several counts, the counts appear in the name in the order they show", () => {
    mount(
      <ContentReaction
        value={[]}
        reactions={REACTIONS}
        counts={{ like: 18, insightful: 7, love: 4 }}
      />,
    );
    expect(visibleText(trigger())).toBe("18 7 4");
    expectLabelInName(trigger());
  });

  it("the spec's own example, counts={{ like: 12, love: 3 }}", () => {
    mount(<ContentReaction value={["love"]} counts={{ like: 12, love: 3 }} />);
    expectLabelInName(trigger());
  });

  it("the name starts with what is visible", () => {
    mount(<ContentReaction value={[]} reactions={REACTIONS} counts={{ like: 18, insightful: 7, love: 4 }} />);
    expect(trigger().getAttribute("aria-label")!.startsWith("18 7 4")).toBe(true);
  });

  it("the per-reaction details still reach a screen reader, as the description", () => {
    mount(<ContentReaction value={[]} reactions={REACTIONS} counts={{ like: 18, insightful: 7, love: 4 }} />);
    const ids = trigger().getAttribute("aria-describedby");
    expect(ids).toBeTruthy();
    const description = ids!
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    expect(description).toBe("React: Like 18, Insightful 7, Love 4");
  });

  it("a single count and no counts still pass", () => {
    mount(<ContentReaction value={["like"]} reactions={REACTIONS} counts={{ like: 18 }} />);
    expectLabelInName(trigger());
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { PullQuote } from "../src/components/PullQuote/PullQuote";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

describe("PullQuote", () => {
  it("renders a real <blockquote>", () => {
    // The reason this exists at all. Across the twelve styles that build a pull
    // quote, ONE used <blockquote>; five used <p> and two used <div>. They all
    // look right and none of them says what it is.
    const { host, unmount } = mount(<PullQuote>We measure twice.</PullQuote>);

    expect((host.firstElementChild as HTMLElement).tagName).toBe("BLOCKQUOTE");
    unmount();
  });

  it("puts the attribution in a <cite>", () => {
    // Zero of the hand-rolled copies did.
    const { host, unmount } = mount(
      <PullQuote attribution="Ana Ruiz">Systems outlive campaigns.</PullQuote>,
    );
    const cite = host.querySelector("cite");

    expect(cite?.textContent).toBe("Ana Ruiz");
    unmount();
  });

  it("keeps the source URL and the visible citation as separate things", () => {
    // `<blockquote cite>` is the SOURCE URL; `<cite>` is the work or speaker.
    // They are routinely collapsed into one another, so they are separate props.
    const { host, unmount } = mount(
      <PullQuote attribution="Ana Ruiz" source="Design Week" citeUrl="https://example.com/piece">
        Quote
      </PullQuote>,
    );
    const bq = host.querySelector("blockquote") as HTMLQuoteElement;

    expect(bq.getAttribute("cite")).toBe("https://example.com/piece");
    expect(host.querySelector("cite")?.textContent).toBe("Ana Ruiz");
    expect(host.querySelector("footer")?.textContent).toContain("Design Week");
    unmount();
  });

  it("omits the footer entirely when unattributed", () => {
    const { host, unmount } = mount(<PullQuote>Anonymous.</PullQuote>);

    expect(host.querySelector("footer")).toBeNull();
    expect(host.querySelector("cite")).toBeNull();
    unmount();
  });

  it("renders a source with no attribution", () => {
    const { host, unmount } = mount(<PullQuote source="Design Week">Quote</PullQuote>);

    expect(host.querySelector("footer")?.textContent).toBe("Design Week");
    expect(host.querySelector("cite"), "no attribution means no cite").toBeNull();
    unmount();
  });

  it("draws the bracketing rules only when asked", () => {
    const cls = (rule: boolean) => {
      const { host, unmount } = mount(<PullQuote rule={rule}>x</PullQuote>);
      const out = (host.firstElementChild as HTMLElement).className;
      unmount();
      return out;
    };

    expect(cls(true)).toContain("border-y");
    expect(cls(false)).not.toContain("border-y");
  });

  it("exposes a handle on each part for restyling", () => {
    const { host, unmount } = mount(<PullQuote attribution="A">q</PullQuote>);

    expect(host.querySelector("[data-react-fancy-pull-quote-text]")?.textContent).toBe("q");
    expect(host.querySelector("[data-react-fancy-pull-quote-attribution]")).toBeTruthy();
    unmount();
  });

  it("un-italicises the cite, which browsers italicise by default", () => {
    // Every hand-rolled copy set its own type and never hit this; a component
    // that emits a real <cite> does.
    const { host, unmount } = mount(<PullQuote attribution="A">q</PullQuote>);

    expect(host.querySelector("cite")?.className).toContain("not-italic");
    unmount();
  });
});

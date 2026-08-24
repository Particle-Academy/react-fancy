// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Callout } from "../src/components/Callout/Callout";
import { Badge } from "../src/components/Badge/Badge";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

describe("Callout forwards rest props (#28)", () => {
  it("puts a data-* handle in the DOM instead of dropping it", () => {
    // THE BUG. Callout destructured its six named props and spread nothing,
    // so everything else was accepted and discarded. TypeScript cannot catch
    // it -- a hyphenated JSX attribute is always allowed and never checked
    // against the props type -- so `data-*` on a Callout typechecked,
    // rendered, and was nowhere in the DOM.
    //
    // Found building fancy-trading-ui, where FOUR agent handles were dead
    // for this reason, each with a passing test, because the tests asserted
    // on rendered text rather than on the handle.
    const { host, unmount } = mount(
      <Callout data-my-handle="x" color="red">Margin call</Callout>,
    );

    expect(host.querySelector('[data-my-handle="x"]')).not.toBeNull();
    unmount();
  });

  it("forwards id, aria-* and event handlers too", () => {
    let clicked = 0;
    const { host, unmount } = mount(
      <Callout id="risk" aria-describedby="hint" onClick={() => { clicked += 1; }}>
        Body
      </Callout>,
    );

    const el = host.querySelector("[data-react-fancy-callout]") as HTMLElement;
    expect(el.id).toBe("risk");
    expect(el.getAttribute("aria-describedby")).toBe("hint");

    act(() => { el.click(); });
    expect(clicked).toBe(1);
    unmount();
  });

  it("matches the convention its neighbours already follow", () => {
    // The defect was that Callout was the ODD ONE OUT. Assert the two
    // together so they cannot drift apart again.
    const c = mount(<Callout data-h="c">x</Callout>);
    const b = mount(<Badge data-h="b">x</Badge>);

    expect(c.host.querySelector('[data-h="c"]'), "Callout").not.toBeNull();
    expect(b.host.querySelector('[data-h="b"]'), "Badge").not.toBeNull();
    c.unmount();
    b.unmount();
  });

  it("keeps role=alert by default and still lets a caller change it", () => {
    // Not every callout is an assertive live region -- a static informational
    // one announcing itself interrupts a screen reader for no reason. The
    // default must not change, but forwarding rest is what makes the escape
    // hatch exist at all.
    const dflt = mount(<Callout>x</Callout>);
    expect((dflt.host.querySelector("[data-react-fancy-callout]") as HTMLElement).getAttribute("role")).toBe("alert");
    dflt.unmount();

    const quiet = mount(<Callout role="status">x</Callout>);
    expect((quiet.host.querySelector("[data-react-fancy-callout]") as HTMLElement).getAttribute("role")).toBe("status");
    quiet.unmount();
  });

  it("does not let a caller clobber the component's own marker or classes", () => {
    // className is merged by `cn`, not replaced, so a caller adds to the
    // styling rather than deleting the variant.
    const { host, unmount } = mount(<Callout className="mine" color="green">x</Callout>);
    const el = host.querySelector("[data-react-fancy-callout]") as HTMLElement;

    expect(el.className).toContain("mine");
    expect(el.className).toContain("rounded-lg");
    unmount();
  });
});

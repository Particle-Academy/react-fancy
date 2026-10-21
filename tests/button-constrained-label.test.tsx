// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";

import { Button } from "../src/components/Button";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function labelOf(el: React.ReactElement): HTMLElement {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  const label = host.querySelector<HTMLElement>("[data-react-fancy-button-label]")!;
  const clone = label.cloneNode(true) as HTMLElement;
  act(() => root.unmount());
  host.remove();
  return clone;
}

const classes = (el: HTMLElement) => el.className.split(/\s+/).filter(Boolean);

/**
 * The showcase's own "Constrained width" example — buttons in 104px columns,
 * captioned "multi-word labels stack left-aligned, icon stays put" — had its
 * labels spilling past the buttons and over each other (measured on
 * production: 104px buttons, label scrollWidth 131-158px).
 *
 * The label carried `whitespace-nowrap`, so in a button narrower than its text
 * there was nowhere for the text to go but out. A constrained label now wraps
 * inside the button; one that must stay on a line opts in with
 * `labelClassName="truncate"`.
 *
 * jsdom has no layout, so this pins the classes; the probe page under
 * sandbox/ measures the real boxes in Chrome.
 */
describe("Button label under a constrained width", () => {
  it("is allowed to wrap: no whitespace-nowrap forcing it onto one line", () => {
    const label = labelOf(
      <Button color="violet" icon="plus" className="w-full">
        New customer
      </Button>,
    );
    expect(classes(label)).not.toContain("whitespace-nowrap");
    // and nothing else forces a single line either
    expect(classes(label).some((c) => /^whitespace-(nowrap|pre)$/.test(c))).toBe(false);
  });

  it("can shrink below its text (min-w-0), and never splits a word", () => {
    const label = labelOf(<Button className="w-full">New customer</Button>);
    expect(classes(label)).toContain("min-w-0");
    // break-words turned "customer" into "custome/r" in a 104px column.
    expect(classes(label).some((c) => /^(break-words|break-all|wrap-anywhere|wrap-break-word)$/.test(c))).toBe(false);
  });

  it("labelClassName=\"truncate\" gives one line with an ellipsis, uncontested", () => {
    const label = labelOf(
      <Button color="violet" icon="plus" className="w-full" labelClassName="truncate">
        Save changes now
      </Button>,
    );
    const c = classes(label);
    expect(c).toContain("truncate");
    expect(c).toContain("min-w-0");
    // A whitespace-normal here would fight truncate's nowrap in the cascade.
    expect(c.some((x) => /^whitespace-/.test(x))).toBe(false);
  });

  it("an unconstrained button renders the same markup apart from the label's classes", () => {
    const html = renderToStaticMarkup(
      <Button color="emerald" icon="check">
        Save
      </Button>,
    );
    expect(html).toContain('data-react-fancy-button=""');
    expect(html).toContain("inline-flex items-center justify-center text-left");
    expect(html).toContain("gap-2");
  });
});

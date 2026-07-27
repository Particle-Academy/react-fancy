// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Breadcrumbs } from "../src/components/Breadcrumbs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/** Every crumb, whatever element it rendered as. */
const crumbs = () => Array.from(document.querySelectorAll("[data-react-fancy-breadcrumbs-item]"));

const crumb = (text: string) => crumbs().find((el) => el.textContent === text);

afterEach(() => {
  document.body.innerHTML = "";
});

/**
 * A crumb that navigates by callback rather than by URL.
 *
 * `<Breadcrumbs.Item>` only ever supported `href`, so a controlled component
 * that owns its own navigation — a repository browser walking directories, a
 * wizard stepping back — had no address to link to, and no way to make a crumb
 * clickable except nesting a button inside the span, which puts interactive
 * content inside a non-interactive element.
 */
describe("Breadcrumbs.Item", () => {
  it("renders a button and fires when it navigates by callback", () => {
    const onClick = vi.fn();

    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item onClick={onClick}>src</Breadcrumbs.Item>
        <Breadcrumbs.Item active>run.ts</Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    const target = crumb("src")!;
    expect(target.tagName).toBe("BUTTON");

    act(() => {
      (target as HTMLButtonElement).click();
    });

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps the current crumb inert, since it is not a destination", () => {
    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item onClick={vi.fn()} active>
          here
        </Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    const target = crumb("here")!;
    expect(target.tagName).toBe("SPAN");
    expect(target.getAttribute("aria-current")).toBe("page");
  });

  it("prefers href when both are given, so a real link stays a real link", () => {
    // A link is right-clickable, middle-clickable and copyable; a button is
    // none of those. Silently downgrading one to the other is the wrong way to
    // resolve the ambiguity.
    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/src" onClick={vi.fn()}>
          src
        </Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    const target = crumb("src")!;
    expect(target.tagName).toBe("A");
    expect(target.getAttribute("href")).toBe("/src");
  });

  it("still renders plain text with neither", () => {
    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item>plain</Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    expect(crumb("plain")!.tagName).toBe("SPAN");
  });
});

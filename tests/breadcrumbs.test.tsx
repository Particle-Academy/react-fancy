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

/**
 * The collapsed (below `md`) dropdown.
 *
 * It rebuilt each item from `label`/`href`/`active` only, so a crumb that
 * navigates by `onClick` — which `Breadcrumbs.Item` supports — became a dead
 * `<span>` in the dropdown. A consumer navigating in-app by callback lost every
 * crumb on a narrow window.
 */
describe("Breadcrumbs collapsed dropdown", () => {
  const dropdown = () => document.querySelector("[data-react-fancy-breadcrumbs-dropdown]")!;
  const open = () =>
    act(() => {
      (dropdown().querySelector("button") as HTMLButtonElement).click();
    });
  const menuItem = (text: string) =>
    Array.from(dropdown().querySelectorAll("a, button, span")).find(
      (el) => el.textContent === text && el !== dropdown().querySelector("button"),
    ) as HTMLElement | undefined;

  it("renders an onClick-only crumb as a button that fires and closes the menu", () => {
    const onClick = vi.fn();

    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item onClick={onClick}>Projects</Breadcrumbs.Item>
        <Breadcrumbs.Item active>Settings</Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    open();
    const item = menuItem("Projects")!;
    expect(item.tagName).toBe("BUTTON");
    expect(item.getAttribute("type")).toBe("button");

    act(() => {
      item.click();
    });

    expect(onClick).toHaveBeenCalledOnce();
    expect(menuItem("Projects")).toBeUndefined();
  });

  it("keeps the active crumb inert even with onClick", () => {
    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
        <Breadcrumbs.Item active onClick={vi.fn()}>
          Here
        </Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    open();
    const items = Array.from(dropdown().querySelectorAll("a, button, span")).filter(
      (el) => el.textContent === "Here",
    );
    // The trigger shows the active label too; the menu entry is the span.
    expect(items.some((el) => el.tagName === "SPAN" && !el.closest("button"))).toBe(true);
    expect(items.filter((el) => el.tagName === "BUTTON" && el !== dropdown().querySelector("button"))).toHaveLength(0);
  });

  it("leaves href crumbs as links that close the menu", () => {
    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item href="/projects">Projects</Breadcrumbs.Item>
        <Breadcrumbs.Item active>Settings</Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    open();
    const item = menuItem("Projects")!;
    expect(item.tagName).toBe("A");
    expect(item.getAttribute("href")).toBe("/projects");

    act(() => {
      item.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(menuItem("Projects")).toBeUndefined();
  });

  it("renders a crumb with `as` through that component", () => {
    const RouterLink = ({ href, ...rest }: { href?: string; [k: string]: unknown }) => (
      <a data-router-link="" href={href} {...rest} />
    );

    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item as={RouterLink} href="/projects">
          Projects
        </Breadcrumbs.Item>
        <Breadcrumbs.Item active>Settings</Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    open();
    const item = menuItem("Projects")!;
    expect(item.hasAttribute("data-router-link")).toBe(true);
    expect(item.getAttribute("href")).toBe("/projects");
  });
});

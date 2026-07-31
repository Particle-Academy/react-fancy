// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, forwardRef, type AnchorHTMLAttributes, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Breadcrumbs } from "../src/components/Breadcrumbs";
import { Menu } from "../src/components/Menu";
import { MobileMenu } from "../src/components/MobileMenu";
import { Navbar } from "../src/components/Navbar";
import { Sidebar } from "../src/components/Sidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

afterEach(() => {
  document.body.innerHTML = "";
});

/**
 * Stand-in for an href-based router link (Inertia, Next). Records that it was
 * the component that rendered, so a silent fall-back to a plain `<a>` — which
 * is a FULL PAGE LOAD, and looks identical in the DOM — fails the test.
 */
const HrefLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  function HrefLink(props, ref) {
    return <a ref={ref} data-router-link="href" {...props} />;
  },
);

/**
 * Stand-in for a `to`-based router link (TanStack Router, React Router). It
 * takes no `href` at all — the case that used to render the inert fallback.
 */
function ToLink({ to, children, ...rest }: { to: string; children?: React.ReactNode }) {
  return (
    <a href={to} data-router-link="to" {...rest}>
      {children}
    </a>
  );
}

/**
 * Every navigation primitive owes a router the same seam.
 *
 * These all hardcoded a plain `<a href>`, so a client-routed app got a full page
 * load out of its own nav chrome, and the only workaround was nesting a router
 * `<Link>` inside the item — an anchor inside an anchor, invalid HTML, and the
 * same nested-anchor shape that already caused an SSR hydration bug here.
 */
const SURFACES = [
  {
    name: "Navbar.Item",
    handle: "[data-react-fancy-navbar-item]",
    render: (props: Record<string, unknown>) => (
      <Navbar>
        <Navbar.Item {...props}>Dashboard</Navbar.Item>
      </Navbar>
    ),
  },
  {
    name: "Sidebar.Item",
    handle: "[data-react-fancy-sidebar-item]",
    render: (props: Record<string, unknown>) => (
      <Sidebar>
        <Sidebar.Item {...props}>Dashboard</Sidebar.Item>
      </Sidebar>
    ),
  },
  {
    name: "Menu.Item",
    handle: "[data-react-fancy-menu-item]",
    render: (props: Record<string, unknown>) => (
      <Menu>
        <Menu.Item {...props}>Dashboard</Menu.Item>
      </Menu>
    ),
  },
  {
    name: "MobileMenu.Item",
    handle: "[data-react-fancy-mobile-menu-item]",
    render: (props: Record<string, unknown>) => (
      <MobileMenu.Flyout open onClose={() => {}}>
        <MobileMenu.Item {...props}>Dashboard</MobileMenu.Item>
      </MobileMenu.Flyout>
    ),
  },
  {
    name: "Breadcrumbs.Item",
    handle: "[data-react-fancy-breadcrumbs-item]",
    render: (props: Record<string, unknown>) => (
      <Breadcrumbs>
        <Breadcrumbs.Item {...props}>Dashboard</Breadcrumbs.Item>
      </Breadcrumbs>
    ),
  },
];

describe.each(SURFACES)("$name", ({ handle, render }) => {
  it("renders the router component given as `as`, not a plain anchor", () => {
    mount(render({ as: HrefLink, href: "/dashboard" }));

    const el = document.querySelector(handle);
    expect(el?.getAttribute("data-router-link")).toBe("href");
    expect(el?.getAttribute("href")).toBe("/dashboard");
  });

  it("engages link mode for a to-based router that passes no href", () => {
    // Without `as` in the link-mode condition this rendered the inert fallback
    // — a nav item that looks right and navigates nowhere.
    mount(render({ as: ToLink, to: "/dashboard" }));

    const el = document.querySelector(handle);
    expect(el?.getAttribute("data-router-link")).toBe("to");
    expect(el?.getAttribute("href")).toBe("/dashboard");
  });

  it("still renders a plain anchor when given only an href", () => {
    mount(render({ href: "/dashboard" }));

    const el = document.querySelector(handle);
    expect(el?.tagName).toBe("A");
    expect(el?.getAttribute("href")).toBe("/dashboard");
    expect(el?.getAttribute("data-router-link")).toBeNull();
  });

  it("keeps its stable handle in link mode", () => {
    // The handle is what an MCP bridge addresses. A router swap must not move it.
    mount(render({ as: HrefLink, href: "/dashboard" }));

    expect(document.querySelectorAll(handle)).toHaveLength(1);
  });
});

/**
 * `onClick` used to be dropped whenever an item had an href — the item both
 * navigates and closes the drawer is the common mobile case, and the handler
 * silently never fired.
 */
describe.each(SURFACES.filter((s) => s.name !== "Breadcrumbs.Item"))(
  "$name onClick in link mode",
  ({ handle, render }) => {
    it("fires the handler alongside navigation", () => {
      const onClick = vi.fn();
      mount(render({ href: "/dashboard", onClick }));

      act(() => {
        (document.querySelector(handle) as HTMLElement).click();
      });

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  },
);

describe("Breadcrumbs.Item", () => {
  it("leaves the current crumb a span even with `as`", () => {
    // The active crumb is the page you are on: a link to it goes nowhere, and
    // aria-current is the accessible signal that matters.
    mount(
      <Breadcrumbs>
        <Breadcrumbs.Item as={HrefLink} href="/here" active>
          Here
        </Breadcrumbs.Item>
      </Breadcrumbs>,
    );

    const el = document.querySelector("[data-react-fancy-breadcrumbs-item]");
    expect(el?.tagName).toBe("SPAN");
    expect(el?.getAttribute("aria-current")).toBe("page");
  });
});

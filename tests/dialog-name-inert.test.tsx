// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { Modal } from "../src/components/Modal";
import { Drawer } from "../src/components/Drawer";
import { PortalContainerContext } from "../src/components/Portal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Reported by a consumer on 6.24.1:
 *
 *  1. Modal (and Drawer) did not name the dialog (axe `aria-dialog-name`).
 *     The header's title now names it through `aria-labelledby`, unless the
 *     host names the dialog itself.
 *  2. The page behind an open Modal or Drawer stayed reachable: a screen
 *     reader's virtual cursor and a pointer could still use it. Everything
 *     outside the dialog's ancestor chain is now `inert` while it is open,
 *     including when the dialog portals into a landmark, and restored after.
 */

let roots: Root[] = [];

afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

function render(into: HTMLElement, el: ReactElement) {
  const root = createRoot(into);
  roots.push(root);
  act(() => root.render(el));
  return (next: ReactElement) => act(() => root.render(next));
}

const noop = () => {};
const dialog = () => document.querySelector<HTMLElement>("[role=dialog]")!;

function nameOf(el: HTMLElement): string {
  const ids = el.getAttribute("aria-labelledby");
  if (ids) {
    return ids
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
  }
  return el.getAttribute("aria-label") ?? "";
}

type Kind = "Modal" | "Drawer";

function Dialog({ kind, open, header = true, ...rest }: { kind: Kind; open: boolean; header?: boolean; children?: ReactNode } & Record<string, unknown>) {
  if (kind === "Modal") {
    return (
      <Modal open={open} onClose={noop} {...rest}>
        {header && <Modal.Header>Edit profile</Modal.Header>}
        <Modal.Body>
          <button>inside</button>
        </Modal.Body>
      </Modal>
    );
  }
  return (
    <Drawer open={open} onClose={noop} {...rest}>
      {header && <Drawer.Header>Edit profile</Drawer.Header>}
      <Drawer.Body>
        <button>inside</button>
      </Drawer.Body>
    </Drawer>
  );
}

describe.each<Kind>(["Modal", "Drawer"])("%s names its dialog", (kind) => {
  const host = () => {
    const el = document.createElement("div");
    document.body.append(el);
    return el;
  };

  it("from the header's title", () => {
    render(host(), <Dialog kind={kind} open />);
    const d = dialog();
    expect(d.getAttribute("aria-labelledby")).toBeTruthy();
    expect(nameOf(d)).toBe("Edit profile");
    // The title, not the whole header: the close button is not part of the name.
    const title = document.getElementById(d.getAttribute("aria-labelledby")!)!;
    expect(title.querySelector("button")).toBeNull();
  });

  it("leaves a host's aria-label alone", () => {
    render(host(), <Dialog kind={kind} open aria-label="Profile editor" />);
    expect(dialog().hasAttribute("aria-labelledby")).toBe(false);
    expect(nameOf(dialog())).toBe("Profile editor");
  });

  it("leaves a host's aria-labelledby alone", () => {
    const h = host();
    const label = document.createElement("h2");
    label.id = "own-title";
    label.textContent = "Mine";
    document.body.append(label);
    render(h, <Dialog kind={kind} open aria-labelledby="own-title" />);
    expect(dialog().getAttribute("aria-labelledby")).toBe("own-title");
    expect(nameOf(dialog())).toBe("Mine");
  });

  it("points at nothing that does not exist without a header", () => {
    render(host(), <Dialog kind={kind} open header={false} />);
    const ids = dialog().getAttribute("aria-labelledby");
    if (ids) for (const id of ids.split(/\s+/)) expect(document.getElementById(id)).not.toBeNull();
  });
});

/**
 * Every element outside the chain from the dialog's portalled frame up to <body>
 * must be inert, and nothing in it. The walk starts at the frame, not the panel:
 * the backdrop beside the panel is the dialog's own, and must stay live because
 * clicking it closes the dialog.
 */
function expectOnlyChainLive(panel: HTMLElement) {
  const frame = panel.closest<HTMLElement>("[data-react-fancy-portal]")!;
  expect(frame, "the dialog is portalled").not.toBeNull();
  expect(frame.querySelector("[aria-hidden=true]")?.hasAttribute("inert") ?? false, "the backdrop stays live").toBe(false);
  for (let el: HTMLElement | null = frame; el && el !== document.body; el = el.parentElement) {
    expect(el.hasAttribute("inert"), `${el.tagName} on the dialog's chain is inert`).toBe(false);
    for (const sib of Array.from(el.parentElement!.children)) {
      if (sib === el) continue;
      expect(sib.hasAttribute("inert"), `sibling <${sib.tagName.toLowerCase()} id="${sib.id}"> is not inert`).toBe(true);
    }
  }
}

function expectNoneInert(except: Element[] = []) {
  for (const el of Array.from(document.body.querySelectorAll("*"))) {
    if (except.includes(el)) continue;
    expect(el.hasAttribute("inert"), `<${el.tagName.toLowerCase()} id="${el.id}"> is still inert`).toBe(false);
  }
}

describe.each<Kind>(["Modal", "Drawer"])("%s makes the page behind it inert", (kind) => {
  it("portalled to <body>: everything else is inert while open, and restored on close", () => {
    const header = Object.assign(document.createElement("header"), { id: "site-header" });
    const app = Object.assign(document.createElement("div"), { id: "app" });
    const footer = Object.assign(document.createElement("footer"), { id: "site-footer" });
    const already = Object.assign(document.createElement("div"), { id: "already-inert" });
    already.setAttribute("inert", "");
    document.body.append(header, app, footer, already);

    const rerender = render(app, <Dialog kind={kind} open={false} />);
    expectNoneInert([already]);

    rerender(<Dialog kind={kind} open />);
    expectOnlyChainLive(dialog());
    expect(app.hasAttribute("inert")).toBe(true);
    expect(header.hasAttribute("inert")).toBe(true);
    expect(footer.hasAttribute("inert")).toBe(true);

    rerender(<Dialog kind={kind} open={false} />);
    expectNoneInert([already]);
    expect(already.hasAttribute("inert"), "an element the host made inert stays inert").toBe(true);
  });

  it("portalled into a landmark through PortalContainerContext", () => {
    const header = Object.assign(document.createElement("header"), { id: "site-header" });
    const main = Object.assign(document.createElement("main"), { id: "main" });
    const content = Object.assign(document.createElement("div"), { id: "content" });
    const footer = Object.assign(document.createElement("footer"), { id: "site-footer" });
    main.append(content);
    document.body.append(header, main, footer);

    const tree = (open: boolean) => (
      <PortalContainerContext.Provider value={main}>
        <Dialog kind={kind} open={open} />
      </PortalContainerContext.Provider>
    );
    const rerender = render(content, tree(false));
    rerender(tree(true));

    const d = dialog();
    expect(main.contains(d)).toBe(true);
    expectOnlyChainLive(d);
    expect(main.hasAttribute("inert"), "the landmark holding the dialog stays live").toBe(false);
    expect(content.hasAttribute("inert")).toBe(true);
    expect(header.hasAttribute("inert")).toBe(true);
    expect(footer.hasAttribute("inert")).toBe(true);

    rerender(tree(false));
    expectNoneInert();
  });

  it("restores on unmount while open", () => {
    const app = Object.assign(document.createElement("div"), { id: "app" });
    const aside = Object.assign(document.createElement("aside"), { id: "aside" });
    document.body.append(app, aside);
    const root = createRoot(app);
    act(() => root.render(<Dialog kind={kind} open />));
    expect(aside.hasAttribute("inert")).toBe(true);
    act(() => root.unmount());
    expectNoneInert();
  });

  it("a closed keepMounted dialog makes nothing inert", () => {
    const app = Object.assign(document.createElement("div"), { id: "app" });
    const aside = Object.assign(document.createElement("aside"), { id: "aside" });
    document.body.append(app, aside);
    const rerender = render(app, <Dialog kind={kind} open keepMounted />);
    expect(aside.hasAttribute("inert")).toBe(true);
    rerender(<Dialog kind={kind} open={false} keepMounted />);
    expect(aside.hasAttribute("inert")).toBe(false);
  });
});

describe("stacked dialogs", () => {
  it("a Drawer opened over a Modal makes the Modal inert, and closing it gives the Modal back", () => {
    const app = Object.assign(document.createElement("div"), { id: "app" });
    document.body.append(app);
    const tree = (drawer: boolean, modal = true) => (
      <>
        <Modal open={modal} onClose={noop}>
          <Modal.Header>First</Modal.Header>
        </Modal>
        <Drawer open={drawer} onClose={noop}>
          <Drawer.Header>Second</Drawer.Header>
        </Drawer>
      </>
    );
    const rerender = render(app, tree(false));
    const modal = document.querySelector<HTMLElement>("[data-react-fancy-modal]")!;
    expect(modal.closest("[inert]")).toBeNull();

    rerender(tree(true));
    expect(modal.closest("[inert]"), "the Modal under the Drawer is inert").not.toBeNull();
    expect(document.querySelector("[data-react-fancy-drawer]")!.closest("[inert]")).toBeNull();

    rerender(tree(false));
    expect(modal.closest("[inert]"), "the Modal is live again").toBeNull();
    expect(app.hasAttribute("inert"), "the page stays inert under the Modal").toBe(true);

    rerender(tree(false, false));
    expectNoneInert();
  });
});

describe("a container-attached Drawer is not modal", () => {
  it("makes nothing inert", () => {
    const app = Object.assign(document.createElement("div"), { id: "app" });
    const aside = Object.assign(document.createElement("aside"), { id: "aside" });
    document.body.append(app, aside);
    render(
      app,
      <div className="relative">
        <span id="beside">beside</span>
        <Drawer open onClose={noop} attach="container">
          <Drawer.Header>Panel</Drawer.Header>
        </Drawer>
      </div>,
    );
    expectNoneInert();
    expect(nameOf(dialog())).toBe("Panel");
  });
});

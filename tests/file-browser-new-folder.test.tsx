// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FileBrowser } from "../src/components/FileBrowser";
import type { FileEntry, FileSnapshotNode } from "../src/components/FileBrowser/FileBrowser.types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Creating a folder — an OPT-IN affordance.
 *
 * `FileBrowser` was read-only: a provider that only ever loads. Apps that let
 * someone organise files had to build their own button beside it, which meant
 * re-implementing the one thing the browser already knows and they do not —
 * which directory is current, what is already in it, and how to refresh it
 * afterwards.
 *
 * Opt-in through the handler, not a boolean. `onCreateFolder` present means the
 * app can create folders; absent means it cannot. A `showNewFolder` flag would
 * let the two disagree — a visible button wired to nothing — and the whole
 * point of the prop is that it is the wiring.
 */
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

const SNAPSHOT: FileSnapshotNode[] = [
  {
    path: "/src",
    name: "src",
    kind: "directory",
    children: [
      { path: "/src/index.ts", name: "index.ts", kind: "file" },
      { path: "/src/components", name: "components", kind: "directory", children: [] },
    ],
  },
];

const q = (sel: string) => document.querySelector(sel);
const newFolderButton = () => q("[data-react-fancy-file-browser-new-folder]") as HTMLButtonElement | null;
const nameInput = () => q("[data-react-fancy-file-browser-new-folder-input]") as HTMLInputElement | null;
const submitButton = () => q("[data-react-fancy-file-browser-new-folder-submit]") as HTMLButtonElement | null;
const cancelButton = () => q("[data-react-fancy-file-browser-new-folder-cancel]") as HTMLButtonElement | null;
const errorNode = () => q("[data-react-fancy-file-browser-new-folder-error]");

function click(el: Element | null) {
  act(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function type(el: HTMLInputElement | null, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, value);
    el!.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function pressKey(el: Element | null, key: string) {
  act(() => {
    el?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the opt-in", () => {
  it("renders NO button when the app supplies no handler", () => {
    // The default. A browser that cannot create folders must not advertise that
    // it can.
    const { unmount } = mount(<FileBrowser snapshot={SNAPSHOT} defaultPath="/src" />);
    expect(newFolderButton()).toBeNull();
    unmount();
  });

  it("renders the button once the app opts in", () => {
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={vi.fn()} />,
    );
    expect(newFolderButton()).not.toBeNull();
    unmount();
  });
});

describe("naming the folder", () => {
  it("opens an inline input rather than a blocking dialog", () => {
    // Deliberately not `window.prompt`: it blocks the event loop, cannot be
    // styled, cannot be driven by an agent, and is unusable on mobile.
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={vi.fn()} />,
    );

    expect(nameInput()).toBeNull();
    click(newFolderButton());
    expect(nameInput()).not.toBeNull();
    unmount();
  });

  it("passes the CURRENT directory and the typed name", async () => {
    const onCreateFolder = vi.fn();
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "utils");
    click(submitButton());

    expect(onCreateFolder).toHaveBeenCalledWith({ parentPath: "/src", name: "utils" });
    unmount();
  });

  it("submits on Enter and closes on Escape", async () => {
    const onCreateFolder = vi.fn();
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "utils");
    pressKey(nameInput(), "Enter");
    expect(onCreateFolder).toHaveBeenCalledTimes(1);

    click(newFolderButton());
    pressKey(nameInput(), "Escape");
    expect(nameInput()).toBeNull();
    expect(onCreateFolder).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("closes the input after a successful create", async () => {
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={vi.fn()} />,
    );

    click(newFolderButton());
    type(nameInput(), "utils");
    await act(async () => {
      submitButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(nameInput()).toBeNull();
    unmount();
  });

  it("cancels without calling the app", () => {
    const onCreateFolder = vi.fn();
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "utils");
    click(cancelButton());

    expect(onCreateFolder).not.toHaveBeenCalled();
    expect(nameInput()).toBeNull();
    unmount();
  });
});

describe("validation happens BEFORE the app is called", () => {
  it("refuses an empty name", () => {
    const onCreateFolder = vi.fn();
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "   ");
    click(submitButton());

    expect(onCreateFolder).not.toHaveBeenCalled();
    expect(submitButton()?.disabled).toBe(true);
    unmount();
  });

  it("refuses a name that already exists in this directory", () => {
    // The browser knows what is in the folder; the app would have to round-trip
    // to find out. Catching it here turns a failed write into a message before
    // anything is attempted.
    const onCreateFolder = vi.fn();
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "components");
    click(submitButton());

    expect(onCreateFolder).not.toHaveBeenCalled();
    expect(errorNode()?.textContent).toMatch(/already exists/i);
    unmount();
  });

  it("counts a FILE of the same name as a collision too", () => {
    const onCreateFolder = vi.fn();
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "index.ts");
    click(submitButton());

    expect(onCreateFolder).not.toHaveBeenCalled();
    unmount();
  });

  it("refuses a path separator", () => {
    // `a/b` is two folders, or an escape out of the current one. Either way it
    // is not a name, and letting it through means the app decides what a
    // traversal attempt means.
    const onCreateFolder = vi.fn();
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "a/b");
    click(submitButton());

    expect(onCreateFolder).not.toHaveBeenCalled();
    expect(errorNode()?.textContent).toMatch(/\//);
    unmount();
  });

  it("refuses .. even without a separator", () => {
    const onCreateFolder = vi.fn();
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "..");
    click(submitButton());

    expect(onCreateFolder).not.toHaveBeenCalled();
    unmount();
  });

  it("trims before it validates and before it submits", () => {
    const onCreateFolder = vi.fn();
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "  utils  ");
    click(submitButton());

    expect(onCreateFolder).toHaveBeenCalledWith({ parentPath: "/src", name: "utils" });
    unmount();
  });
});

describe("when the app's handler is async", () => {
  it("surfaces a rejection instead of closing as though it worked", async () => {
    // The failure that matters. Closing the input on a rejected promise tells
    // the person their folder was created; the next refresh says otherwise.
    const onCreateFolder = vi.fn().mockRejectedValue(new Error("EACCES: permission denied"));
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "utils");
    await act(async () => {
      submitButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(errorNode()?.textContent).toMatch(/permission denied/i);
    expect(nameInput()).not.toBeNull();
    unmount();
  });

  it("does not fire twice while the first create is in flight", async () => {
    let release: (() => void) | undefined;
    const onCreateFolder = vi.fn(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    const { unmount } = mount(
      <FileBrowser snapshot={SNAPSHOT} defaultPath="/src" onCreateFolder={onCreateFolder} />,
    );

    click(newFolderButton());
    type(nameInput(), "utils");
    click(submitButton());
    click(submitButton());

    expect(onCreateFolder).toHaveBeenCalledTimes(1);
    expect(submitButton()?.disabled).toBe(true);

    await act(async () => {
      release?.();
    });
    unmount();
  });
});

describe("provider mode", () => {
  it("reloads the directory so the new folder actually appears", async () => {
    // Without this the create succeeds and the tree still shows the old
    // listing — which reads as a failed create.
    const children: Record<string, FileEntry[]> = {
      "/src": [{ path: "/src/index.ts", name: "index.ts", kind: "file" }],
    };
    const loadChildren = vi.fn(async (p: string) => children[p] ?? []);

    const { unmount } = mount(
      <FileBrowser
        provider={{ loadChildren }}
        defaultPath="/src"
        onCreateFolder={async ({ parentPath, name }) => {
          children[parentPath] = [
            ...(children[parentPath] ?? []),
            { path: `${parentPath}/${name}`, name, kind: "directory" },
          ];
        }}
      />,
    );

    await act(async () => {});
    const before = loadChildren.mock.calls.length;

    click(newFolderButton());
    type(nameInput(), "utils");
    await act(async () => {
      submitButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {});

    expect(loadChildren.mock.calls.length).toBeGreaterThan(before);
    expect(loadChildren).toHaveBeenLastCalledWith("/src");
    unmount();
  });

  it("does NOT reload when the create failed", async () => {
    const loadChildren = vi.fn(async () => []);
    const { unmount } = mount(
      <FileBrowser
        provider={{ loadChildren }}
        defaultPath="/src"
        onCreateFolder={async () => { throw new Error("nope"); }}
      />,
    );

    await act(async () => {});
    const before = loadChildren.mock.calls.length;

    click(newFolderButton());
    type(nameInput(), "utils");
    await act(async () => {
      submitButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(loadChildren.mock.calls.length).toBe(before);
    unmount();
  });
});

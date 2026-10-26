// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "../src/components/Editor/Editor";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `Editor.Toolbar toolbarExtra` — a host slot INSIDE the default toolbar.
 *
 * Before it existed, a host using `<Editor.Toolbar showFullScreenToggle />` had
 * nowhere to put Save/Cancel: passing children replaces the whole default
 * toolbar, so in full screen the host's own Save was unreachable until Escape.
 * Named and placed to match fancy-sheets' `SheetWorkbook toolbarExtra`: after
 * the editor's own controls, before the full-screen toggle, which stays at the
 * trailing edge.
 */
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    unmount: () => act(() => root.unmount()),
    editor: () => host.querySelector<HTMLElement>("[data-react-fancy-editor]")!,
    toolbar: () => host.querySelector<HTMLElement>("[data-react-fancy-editor-toolbar]")!,
    toggle: () => host.querySelector<HTMLButtonElement>("[data-react-fancy-editor-fullscreen-toggle]"),
  };
}

function html(el: ReactElement): string {
  const view = mount(el);
  const out = view.toolbar().outerHTML;
  view.unmount();
  document.body.innerHTML = "";
  return out;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("Editor.Toolbar — toolbarExtra", () => {
  it("renders the host content inside the DEFAULT toolbar, keeping the default actions", () => {
    const view = mount(
      <Editor defaultValue="<p>x</p>">
        <Editor.Toolbar toolbarExtra={<button type="button" data-host-save="">Save</button>} />
        <Editor.Content />
      </Editor>,
    );
    const toolbar = view.toolbar();
    const save = toolbar.querySelector("[data-host-save]");
    expect(save).not.toBeNull();
    // The default toolbar is still there, not replaced.
    expect(toolbar.querySelector('button[title="Bold"]')).not.toBeNull();
    // Stable handle for the slot itself.
    const slot = toolbar.querySelector("[data-react-fancy-editor-toolbar-extra]");
    expect(slot).not.toBeNull();
    expect(slot!.contains(save)).toBe(true);
    view.unmount();
  });

  it("renders alongside the full-screen toggle, before it, and stays reachable in full screen", () => {
    const onSave = vi.fn();
    const view = mount(
      <Editor defaultValue="<p>x</p>">
        <Editor.Toolbar
          showFullScreenToggle
          toolbarExtra={
            <button type="button" data-host-save="" onClick={onSave}>
              Save
            </button>
          }
        />
        <Editor.Content />
      </Editor>,
    );
    const toolbar = view.toolbar();
    const save = toolbar.querySelector<HTMLButtonElement>("[data-host-save]")!;
    const toggle = view.toggle()!;
    expect(save).not.toBeNull();
    expect(toggle).not.toBeNull();
    // Slot sits before the toggle, so the toggle keeps the trailing edge.
    expect(save.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    act(() => toggle.click());
    expect(view.editor().getAttribute("data-fullscreen")).toBe("true");
    // Still inside the full-screen surface, so it is in the top layer with it.
    expect(view.editor().contains(save)).toBe(true);
    act(() => save.click());
    expect(onSave).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("pushes itself to the trailing edge when there is no source toggle", () => {
    const view = mount(
      <Editor defaultValue="<p>x</p>">
        <Editor.Toolbar
          showSourceToggle={false}
          showFullScreenToggle
          toolbarExtra={<button type="button">Save</button>}
        />
        <Editor.Content />
      </Editor>,
    );
    const slot = view.host.querySelector("[data-react-fancy-editor-toolbar-extra]")!;
    expect(slot.className.split(" ")).toContain("ml-auto");
    // Exactly one ml-auto, or the gap is split between two elements.
    expect(view.toolbar().querySelectorAll(".ml-auto")).toHaveLength(1);
    view.unmount();
  });

  it("leaves the default toolbar byte-identical when the slot is unused", () => {
    for (const props of [
      {},
      { showFullScreenToggle: true },
      { showSourceToggle: false, showFullScreenToggle: true },
      { showSourceToggle: false },
    ]) {
      const without = html(
        <Editor defaultValue="<p>x</p>">
          <Editor.Toolbar {...props} />
          <Editor.Content />
        </Editor>,
      );
      for (const empty of [undefined, null, false]) {
        const withEmpty = html(
          <Editor defaultValue="<p>x</p>">
            <Editor.Toolbar {...props} toolbarExtra={empty} />
            <Editor.Content />
          </Editor>,
        );
        expect(withEmpty).toBe(without);
      }
      expect(without).not.toContain("toolbar-extra");
    }
  });

  it("is ignored when children replace the default toolbar", () => {
    const view = mount(
      <Editor defaultValue="<p>x</p>">
        <Editor.Toolbar toolbarExtra={<span data-host-save="" />}>
          <span data-custom="" />
        </Editor.Toolbar>
        <Editor.Content />
      </Editor>,
    );
    expect(view.host.querySelector("[data-custom]")).not.toBeNull();
    expect(view.host.querySelector("[data-host-save]")).toBeNull();
    view.unmount();
  });
});

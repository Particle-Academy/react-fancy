// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "../src/components/Editor/Editor";
import { useEditor } from "../src/components/Editor/Editor.context";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
    editor: () => host.querySelector<HTMLElement>("[data-react-fancy-editor]")!,
    toggle: () => host.querySelector<HTMLButtonElement>("[data-react-fancy-editor-fullscreen-toggle]"),
    content: () => host.querySelector<HTMLElement>("[data-react-fancy-editor-content]")!,
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("Editor — full screen", () => {
  it("does not show a full-screen toggle unless asked (nothing changes for existing consumers)", () => {
    const view = mount(
      <Editor defaultValue="<p>x</p>">
        <Editor.Toolbar />
        <Editor.Content />
      </Editor>,
    );
    expect(view.toggle()).toBeNull();
    expect(view.editor().getAttribute("data-fullscreen")).toBe("false");
    view.unmount();
  });

  it("puts a toggle in the default toolbar with showFullScreenToggle", () => {
    const onChange = vi.fn();
    const view = mount(
      <Editor defaultValue="<p>x</p>" onFullScreenChange={onChange}>
        <Editor.Toolbar showFullScreenToggle />
        <Editor.Content />
      </Editor>,
    );
    const toggle = view.toggle()!;
    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute("data-react-fancy-fullscreen-toggle")).toBe("");
    expect(toggle.getAttribute("aria-label")).toBe("Enter full screen");
    // Lucide glyph through react-fancy's own <Icon>.
    expect(toggle.querySelector("[data-react-fancy-icon]")).not.toBeNull();

    act(() => toggle.click());
    expect(onChange).toHaveBeenCalledWith(true);
    expect(view.editor().getAttribute("data-fullscreen")).toBe("true");
    expect(view.editor().style.position).toBe("fixed");
    expect(toggle.getAttribute("aria-label")).toBe("Exit full screen");

    act(() => toggle.click());
    expect(view.editor().getAttribute("data-fullscreen")).toBe("false");
    view.unmount();
  });

  it("is controllable through Editor props", () => {
    const view = mount(
      <Editor defaultValue="<p>x</p>" fullScreen>
        <Editor.Toolbar />
        <Editor.Content />
      </Editor>,
    );
    expect(view.editor().getAttribute("data-fullscreen")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");

    view.rerender(
      <Editor defaultValue="<p>x</p>" fullScreen={false}>
        <Editor.Toolbar />
        <Editor.Content />
      </Editor>,
    );
    expect(view.editor().getAttribute("data-fullscreen")).toBe("false");
    expect(document.body.style.overflow).toBe("");
    view.unmount();
  });

  it("keeps the toolbar and lets the content fill, ignoring maxHeight while full screen", () => {
    const view = mount(
      <Editor defaultValue="<p>x</p>" defaultFullScreen>
        <Editor.Toolbar showFullScreenToggle />
        <Editor.Content maxHeight={200} />
      </Editor>,
    );
    expect(view.host.querySelector("[data-react-fancy-editor-toolbar]")).not.toBeNull();
    expect(view.content().style.maxHeight).toBe("");

    act(() => view.toggle()!.click());
    expect(view.content().style.maxHeight).toBe("200px");
    view.unmount();
  });

  it("exits on Escape from inside the content and keeps the typed value", () => {
    const onChange = vi.fn();
    const view = mount(
      <Editor defaultValue="<p>keep me</p>" defaultFullScreen onFullScreenChange={onChange}>
        <Editor.Toolbar />
        <Editor.Content />
      </Editor>,
    );
    const content = view.content();
    act(() => content.focus());
    act(() => {
      content.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith(false);
    // Same node: the surface is not remounted, so caret, undo and seeded HTML survive.
    expect(view.content()).toBe(content);
    expect(content.innerHTML).toContain("keep me");
    view.unmount();
  });

  it("exposes the state to custom toolbars through useEditor()", () => {
    function Custom() {
      const { fullScreen, setFullScreen } = useEditor();
      return (
        <button data-testid="custom" onClick={() => setFullScreen(!fullScreen)}>
          {fullScreen ? "exit" : "enter"}
        </button>
      );
    }
    const view = mount(
      <Editor defaultValue="<p>x</p>">
        <Editor.Toolbar>
          <Custom />
          <Editor.FullScreenToggle />
        </Editor.Toolbar>
        <Editor.Content />
      </Editor>,
    );
    const custom = view.host.querySelector<HTMLButtonElement>('[data-testid="custom"]')!;
    act(() => custom.click());
    expect(custom.textContent).toBe("exit");
    expect(view.toggle()!.getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });
});

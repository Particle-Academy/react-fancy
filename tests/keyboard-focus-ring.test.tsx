// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { AudioViewer } from "../src/components/AudioViewer";
import { CodeView } from "../src/components/CodeView";
import { Editor } from "../src/components/Editor";
import { FileBrowser } from "../src/components/FileBrowser";
import { StickyNote } from "../src/components/StickyNote";
import { VirtualList } from "../src/components/VirtualList";
import { mount, unmountAll } from "./contrast-assert";
import { installRenderedCss, removeRenderedCss, resolveVars } from "./rendered-css";

/**
 * Lab run 651 (test-81, every-component-kit-v1): a Tab walk that reads the
 * FOCUSED element's computed `outline` / `box-shadow` found these focus stops
 * showing nothing at 375, 768 and 1280 px. Each one carried `outline-none`
 * and nothing in its place, and no ancestor or child painted a ring either
 * (measured in Chromium against the built site), so a keyboard user lost
 * track of where they were.
 *
 * The fix is the kit's ring on the focused element itself, the same one
 * ChatThread and CodeBlock use for their scroll regions:
 * `focus-visible:ring-2 focus-visible:ring-inset` in the `--fancy-focus` token.
 *
 * jsdom never matches `:focus-visible`, so `[data-force-focus-visible]` stands
 * in for it (rendered-css.ts) and the test measures the compiled ring rather
 * than grepping for a class name.
 */

afterEach(() => {
  unmountAll();
  removeRenderedCss();
});

/** The ring a Tailwind `ring-*` paints: its width from the ring shadow. */
function ringWidth(el: Element): string | null {
  const shadow = resolveVars(el, getComputedStyle(el).getPropertyValue("--tw-ring-shadow"));
  const m = /0 0 0 calc\((\d+)px/.exec(shadow) ?? /0 0 0 (\d+)px/.exec(shadow);
  return m ? `${m[1]}px` : null;
}

async function expectKitRing(el: Element | null, what: string) {
  expect(el, `${what} rendered`).not.toBeNull();
  el!.setAttribute("data-force-focus-visible", "");
  await installRenderedCss({ forceFocusVisible: true });
  expect(ringWidth(el!), `${what}: a 2px ring while focus-visible`).toBe("2px");
  const cls = el!.className.split(/\s+/);
  expect(cls, `${what}: the light focus token`).toContain("focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))]");
  expect(cls, `${what}: the dark focus token`).toContain("dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]");
}

describe("focus stops that showed no focus now ring in the kit token", () => {
  it("StickyNote: the editable text", async () => {
    const { host } = mount(<StickyNote editable label="Sticky note" defaultValue="Call the accountant" />);
    await expectKitRing(host.querySelector('[role="textbox"][aria-label="Sticky note"]'), "StickyNote");
  });

  it("VirtualList: the scrollable log region", async () => {
    const items = [{ id: "a" }, { id: "b" }];
    const { host } = mount(<VirtualList items={items} renderRow={(i) => <div>{i.id}</div>} height={120} />);
    await expectKitRing(host.querySelector("[data-react-fancy-virtual-list]"), "VirtualList");
  });

  it("CodeView: the editing textarea", async () => {
    const { host } = mount(<CodeView value="const a = 1;" label="Code" />);
    await expectKitRing(host.querySelector("[data-react-fancy-code-view-input]"), "CodeView");
  });

  it("Editor: the contenteditable surface", async () => {
    let host!: HTMLElement;
    await act(async () => {
      host = mount(
        <Editor defaultValue="<p>Draft your invoice note here.</p>">
          <Editor.Content />
        </Editor>,
      ).host;
    });
    await expectKitRing(host.querySelector("[data-react-fancy-editor-content]"), "Editor");
  });

  it("FileBrowser: the name filter input", async () => {
    let host!: HTMLElement;
    await act(async () => {
      host = mount(<FileBrowser snapshot={[{ path: "/reports", name: "reports", kind: "dir" }]} />).host;
    });
    await expectKitRing(host.querySelector('input[aria-label="Filter by name"]'), "FileBrowser filter");
  });
});

describe("AudioViewer shows focus while its native controls have it", () => {
  // Like VideoViewer (K8): Tab lands on the play / timeline / volume controls
  // inside the user-agent shadow root, where the host matches `:focus-within`
  // but not `:focus-visible`, so the UA outline did not draw. Lab run 651
  // flagged `audio` at every width.
  it("an inset 2px solid outline when only :focus-within matches", async () => {
    const { host } = mount(<AudioViewer src="/impact.webm" />);
    const audio = host.querySelector("audio")!;
    audio.setAttribute("data-force-focus-within", "");
    await installRenderedCss({ forceFocusWithin: true });
    const st = getComputedStyle(audio);
    expect(st.outlineStyle).toBe("solid");
    expect(st.outlineWidth).toBe("2px");
    expect(resolveVars(audio, st.outlineColor)).not.toBe("");
    const cls = audio.className.split(/\s+/);
    expect(cls).toContain("focus-within:outline-[color:var(--fancy-focus,var(--color-blue-500))]");
    expect(cls).toContain("dark:focus-within:outline-[color:var(--fancy-focus-dark,var(--color-blue-400))]");
  });
});

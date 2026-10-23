// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FileUpload } from "../src/components/FileUpload";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Keyboard access to the dropzone (found by Maipa against 5.59.0).
 *
 * The default `<FileUpload><FileUpload.Dropzone/></FileUpload>` was a clickable
 * div around a `display:none` file input: no tabIndex, no role, no key handler.
 * A mouse user could open the picker; a keyboard or switch user could not reach
 * the control at all, and a screen reader announced nothing to activate. The
 * only route to choosing a file was a pointer.
 *
 * The fix is a real `<button type="button">` inside the zone, so focus, Enter
 * and Space come from the platform rather than from a hand-rolled key handler
 * that would have to get Space-on-keyup right. jsdom does not synthesise a
 * click from Enter/Space on a button, so these tests drive `click()` on the
 * button (what the browser dispatches for those keys) and assert the trigger IS
 * a native button, which is what makes that equivalence true.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const browse = (host: HTMLElement) =>
  host.querySelector<HTMLButtonElement>("[data-react-fancy-file-upload-browse]");
const input = (host: HTMLElement) => host.querySelector<HTMLInputElement>('input[type="file"]')!;
const zone = (host: HTMLElement) => host.querySelector<HTMLElement>("[data-react-fancy-file-upload-dropzone]")!;

/** The accessible name, computed the simple way: aria-label, else text. */
function nameOf(el: HTMLElement): string {
  return (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();
}

afterEach(() => vi.restoreAllMocks());

describe("FileUpload.Dropzone keyboard access", () => {
  it("renders a native, focusable browse button on the default composition", () => {
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone />
        <FileUpload.List />
      </FileUpload>,
    );

    const btn = browse(host);
    expect(btn).not.toBeNull();
    expect(btn!.tagName).toBe("BUTTON");
    expect(btn!.type).toBe("button");
    expect(btn!.disabled).toBe(false);
    expect(btn!.tabIndex).toBe(0);

    act(() => btn!.focus());
    expect(document.activeElement).toBe(btn);
    unmount();
  });

  it("gives the trigger an accessible name, default and custom", () => {
    const a = mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    expect(nameOf(browse(a.host)!)).toMatch(/browse/i);
    a.unmount();

    const b = mount(
      <FileUpload>
        <FileUpload.Dropzone browseLabel="Choose receipts">
          <p>Drop your receipts</p>
        </FileUpload.Dropzone>
      </FileUpload>,
    );
    expect(nameOf(browse(b.host)!)).toBe("Choose receipts");
    // Custom children still render.
    expect(b.host.textContent).toContain("Drop your receipts");
    b.unmount();
  });

  it("keeps a trigger when the dropzone has custom children", () => {
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone>
          <p>Drop images here</p>
        </FileUpload.Dropzone>
      </FileUpload>,
    );
    const btn = browse(host)!;
    expect(btn).not.toBeNull();
    expect(nameOf(btn)).toMatch(/browse/i);
    unmount();
  });

  it("associates the trigger with the hidden input", () => {
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    const btn = browse(host)!;
    const el = input(host);
    expect(el.id).toBeTruthy();
    expect(btn.getAttribute("aria-controls")).toBe(el.id);
    expect(el.getAttribute("aria-label")).toBeTruthy();
    // The input is not a second tab stop.
    expect(el.tabIndex).toBe(-1);
    unmount();
  });

  it("activating the trigger opens the picker exactly once", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    // Enter and Space on a native button dispatch this click.
    act(() => browse(host)!.click());
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0]).toBe(input(host));
    unmount();
  });

  it("a click anywhere on the zone still opens the picker once", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone>
          <p data-testid="copy">Drop here</p>
        </FileUpload.Dropzone>
      </FileUpload>,
    );
    act(() => host.querySelector<HTMLElement>('[data-testid="copy"]')!.click());
    expect(click).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("disabled: the trigger is not focusable or activatable, and the zone says so", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const { host, unmount } = mount(
      <FileUpload disabled>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    const btn = browse(host)!;
    expect(btn.disabled).toBe(true);
    expect(zone(host).getAttribute("aria-disabled")).toBe("true");

    act(() => btn.focus());
    expect(document.activeElement).not.toBe(btn);

    act(() => btn.click());
    act(() => zone(host).click());
    expect(click).not.toHaveBeenCalled();
    unmount();
  });

  it("shows a visible focus ring, token-driven, in light and dark", () => {
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    const cls = zone(host).className + " " + browse(host)!.className;
    expect(cls).toContain("ring-[color:var(--fancy-focus,var(--color-blue-500))]");
    expect(cls).toContain("dark:has-focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]");
    unmount();
  });

  it("the focus ring is the focus token at FULL opacity, with an offset", () => {
    // Review on e45a888: `/40` rendered a 2px ring at 40% opacity on the dashed
    // border, well under WCAG 2.2's 3:1 for a focus indicator.
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    const classes = zone(host).className.split(/\s+/);
    expect(classes).toContain("has-focus-visible:ring-2");
    expect(classes).toContain("has-focus-visible:ring-offset-2");
    expect(classes).toContain("has-focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))]");
    expect(classes).toContain("dark:has-focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]");
    // No translucent focus ring anywhere on the zone or its trigger.
    const all = (zone(host).className + " " + browse(host)!.className).split(/\s+/);
    expect(all.filter((c) => /ring-\[color:var\(--fancy-focus[^\]]*\]\/\d+/.test(c))).toEqual([]);
    unmount();
  });

  it("files chosen through the picker still reach a controlled onChange", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload value={[]} onChange={onChange} maxFiles={1}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    const el = input(host);
    const files = [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })];
    Object.defineProperty(el, "files", { value: files, configurable: true });
    act(() => {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].map((f: File) => f.name)).toEqual(["a.png"]);
    unmount();
  });
});

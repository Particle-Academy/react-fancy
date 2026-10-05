// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FileUpload } from "../src/components/FileUpload";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A single-file upload can change its mind, and the same file can be chosen twice.
 *
 * Both reported by the YouGene estate against 5.32.0, both reproduced here
 * against the shipped code before anything was changed.
 *
 * ---------------------------------------------------------------------------
 * 1. `multiple={false}` kept the OLD file
 * ---------------------------------------------------------------------------
 *
 * `addFiles` computed `[...files, ...toAdd].slice(0, cap)` with `cap = 1`, so
 * the second choice produced `[old]` and the new file was discarded in silence.
 * A single-file field you cannot change is not a single-file field.
 *
 * The old behaviour was deliberate — the comment read "first-wins rather than
 * replace-last, so the two props cannot disagree about what a single-file
 * upload means". That reasoning treated `multiple={false}` and `maxFiles={1}` as
 * the same statement. They are not:
 *
 *   - `maxFiles={n}` is a QUOTA. Filling it and refusing the overflow is right;
 *     dropping five files into a three-file field should keep three, not the
 *     last three.
 *   - `multiple={false}` is a FIELD SHAPE — "this input holds one file". The
 *     analogue is a radio group, where choosing again moves the selection.
 *
 * So they are now allowed to differ, on purpose, and that is the whole change:
 * `multiple={false}` replaces, `maxFiles` still first-wins.
 *
 * ---------------------------------------------------------------------------
 * 2. Re-choosing the same file did nothing
 * ---------------------------------------------------------------------------
 *
 * The hidden `<input type="file">` was never reset, and an input whose `value`
 * still holds a path fires NO `change` event when the user picks that same path
 * again. So "remove it, then choose it again" and "retry the import that just
 * failed" were both dead gestures — the component did not reject the file, it
 * never heard about it.
 *
 * This one is invisible to any test that only ever chooses DIFFERENT files,
 * which is why it survived: the natural way to write a file-upload test is to
 * use `a.png` then `b.png`.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function file(name: string, type = "image/png") {
  return new File(["x"], name, { type });
}

const input = (host: HTMLElement) =>
  host.querySelector<HTMLInputElement>('input[type="file"]')!;

/** Choose files through the hidden input, the way the browse dialog does. */
function choose(host: HTMLElement, files: File[]) {
  const el = input(host);
  Object.defineProperty(el, "files", { value: files, configurable: true });
  act(() => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("FileUpload — single-file replace", () => {
  it("replaces the file when multiple={false} and another is chosen", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload multiple={false} onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    choose(host, [file("first.png")]);
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ name: "first.png" })]);

    choose(host, [file("second.png")]);

    const last = onChange.mock.lastCall?.[0] as File[];
    expect(last).toHaveLength(1);
    expect(last[0].name).toBe("second.png");

    unmount();
  });

  it("keeps maxFiles first-wins — a quota refuses the overflow", () => {
    // The other half of the rule, so the change above cannot quietly turn
    // `maxFiles` into "keep the newest N" as well.
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload maxFiles={2} onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    choose(host, [file("a.png"), file("b.png")]);
    choose(host, [file("c.png")]);

    const last = onChange.mock.lastCall?.[0] as File[];
    expect(last.map((f) => f.name)).toEqual(["a.png", "b.png"]);

    unmount();
  });

  it("clears the input value so the SAME file can be chosen again", () => {
    const { host, unmount } = mount(
      <FileUpload multiple={false}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    const el = input(host);

    /*
     * Observe the WRITE, not the resulting value.
     *
     * The obvious test — set `value`, fire change, assert it is now `""` — passes
     * against the broken component, because jsdom refuses any non-empty value on
     * a file input, so the field reads `""` before the handler ever runs. It
     * asserts the starting state and calls it a result.
     *
     * So this records assignments instead. In a browser the suppressed second
     * `change` event is caused precisely by the component NOT performing this
     * write, which makes the write the thing worth asserting.
     */
    const writes: string[] = [];
    Object.defineProperty(el, "value", {
      configurable: true,
      get: () => "",
      set: (v: string) => void writes.push(v),
    });

    choose(host, [file("same.png")]);

    expect(writes).toContain("");

    unmount();
  });
});

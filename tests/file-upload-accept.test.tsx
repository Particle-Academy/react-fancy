// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FileUpload } from "../src/components/FileUpload";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `accept` and `multiple` were WIRED TO NOTHING.
 *
 * Both were declared on `FileUploadProps` and both were real props as far as a
 * consumer or an agent reading the types could tell. Neither was destructured
 * in `FileUploadRoot`, neither reached the hidden `<input>`, and neither was
 * consulted in `addFiles`. So `accept="image/*"` filtered nothing in the browse
 * dialog AND accepted any dropped file, while `multiple={false}` sat next to an
 * input that hard-coded `multiple`.
 *
 * The drop path is the half a browser will never cover for us. `accept` on an
 * `<input type="file">` is enforced by the file picker; a drop bypasses the
 * picker entirely, so a component that only forwarded the attribute would still
 * take a .exe dropped onto an image-only zone. That is why the matcher exists
 * rather than just an attribute pass-through — the prop has to mean the same
 * thing on both paths or it means nothing on the one that matters.
 */
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function file(name: string, type: string, size = 8) {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

function drop(host: HTMLElement, files: File[]) {
  const zone = host.querySelector("[data-react-fancy-file-upload-dropzone]")!;
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { files } });
  act(() => {
    zone.dispatchEvent(event);
  });
}

const input = (host: HTMLElement) =>
  host.querySelector<HTMLInputElement>('input[type="file"]')!;

describe("FileUpload accept + multiple", () => {
  it("forwards accept to the hidden input so the browse dialog filters", () => {
    const { host, unmount } = mount(
      <FileUpload accept="image/*">
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    expect(input(host).getAttribute("accept")).toBe("image/*");
    unmount();
  });

  it("refuses a DROPPED file the accept string excludes", () => {
    // The picker never ran, so nothing but us can reject this.
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload accept="image/*" onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("payload.exe", "application/x-msdownload")]);

    expect(onChange).toHaveBeenCalledWith([]);
    unmount();
  });

  it("keeps a dropped file the accept string allows, by wildcard and by extension", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload accept="image/*,.csv" onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    // A .csv carries no reliable type in a drop — extension rules decide it.
    drop(host, [file("chart.png", "image/png"), file("rows.csv", "")]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].map((f: File) => f.name)).toEqual([
      "chart.png",
      "rows.csv",
    ]);
    unmount();
  });

  it("matches an exact mime type and is case-insensitive about it", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload accept="text/plain,.PNG" onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [
      file("notes.txt", "TEXT/PLAIN"),
      file("shot.png", ""),
      file("sheet.xlsx", "application/vnd.ms-excel"),
    ]);

    expect(onChange.mock.calls[0][0].map((f: File) => f.name)).toEqual([
      "notes.txt",
      "shot.png",
    ]);
    unmount();
  });

  it("accepts everything when accept is absent", () => {
    // A guard that refused by default would be worse than the bug it replaced.
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("payload.exe", "application/x-msdownload")]);

    expect(onChange.mock.calls[0][0]).toHaveLength(1);
    unmount();
  });

  it("honours multiple={false} on the input and on a multi-file drop", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload multiple={false} onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    expect(input(host).multiple).toBe(false);

    drop(host, [file("a.png", "image/png"), file("b.png", "image/png")]);

    expect(onChange.mock.calls[0][0].map((f: File) => f.name)).toEqual(["a.png"]);
    unmount();
  });

  it("still allows many files by default", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    expect(input(host).multiple).toBe(true);

    drop(host, [file("a.png", "image/png"), file("b.png", "image/png")]);

    expect(onChange.mock.calls[0][0]).toHaveLength(2);
    unmount();
  });

  it("refuses a dropped file over maxSize", () => {
    // Already worked; pinned because the drop path is where it would regress.
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload maxSize={100} onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("big.png", "image/png", 4096)]);

    expect(onChange).toHaveBeenCalledWith([]);
    unmount();
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FileUpload, useFileUpload } from "../src/components/FileUpload";
import type { FileRejection } from "../src/components/FileUpload";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Every way `FileUpload` refuses a file used to be silent: a file failing
 * `accept` or `maxSize`, the overflow past `maxFiles`, and the extra files of a
 * batch dropped on a single-file field. The user saw nothing happen and the host
 * had nothing to report it with.
 *
 * All three routes in (picker, drop, `useFileUpload().addFiles`) go through one
 * function, but the tests drive each, because that is a fact about the code today
 * rather than a promise.
 */
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function file(name: string, type = "image/png", size = 8) {
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

function pick(host: HTMLElement, files: File[]) {
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { value: files, configurable: true });
  act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

const reasons = (r: FileRejection[]) => r.map((x) => [x.name, x.reason]);

describe("FileUpload onReject", () => {
  it("reports a DROPPED file failing accept", () => {
    const onReject = vi.fn();
    const { host, unmount } = mount(
      <FileUpload accept="image/*" onReject={onReject}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("report.pdf", "application/pdf"), file("ok.png")]);

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(reasons(onReject.mock.calls[0][0])).toEqual([["report.pdf", "accept"]]);
    unmount();
  });

  it("reports a PICKED file over maxSize", () => {
    const onReject = vi.fn();
    const { host, unmount } = mount(
      <FileUpload maxSize={10} onReject={onReject}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    pick(host, [file("big.png", "image/png", 11), file("exact.png", "image/png", 10)]);

    expect(reasons(onReject.mock.calls[0][0])).toEqual([["big.png", "maxSize"]]);
    unmount();
  });

  it("reports addFiles callers too", () => {
    const onReject = vi.fn();
    let add: (files: File[]) => void = () => {};
    function Grab() {
      add = useFileUpload().addFiles;
      return null;
    }
    const { unmount } = mount(
      <FileUpload accept="image/*" onReject={onReject}>
        <Grab />
      </FileUpload>,
    );

    act(() => add([file("a.txt", "text/plain")]));

    expect(reasons(onReject.mock.calls[0][0])).toEqual([["a.txt", "accept"]]);
    unmount();
  });

  it("reports the overflow past maxFiles, and only the overflow", () => {
    const onReject = vi.fn();
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload maxFiles={2} onReject={onReject} onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("1.png"), file("2.png"), file("3.png"), file("4.png")]);

    expect(onChange.mock.calls[0][0].map((f: File) => f.name)).toEqual(["1.png", "2.png"]);
    expect(reasons(onReject.mock.calls[0][0])).toEqual([
      ["3.png", "maxFiles"],
      ["4.png", "maxFiles"],
    ]);
    unmount();
  });

  it("counts existing files against maxFiles", () => {
    const onReject = vi.fn();
    const { host, unmount } = mount(
      <FileUpload value={[file("held.png")]} maxFiles={1} onReject={onReject}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("new.png")]);

    expect(reasons(onReject.mock.calls[0][0])).toEqual([["new.png", "maxFiles"]]);
    unmount();
  });

  it("names the first rule a file failed, once per file", () => {
    const onReject = vi.fn();
    const { host, unmount } = mount(
      <FileUpload accept="image/*" maxSize={10} maxFiles={1} onReject={onReject}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [
      file("both.pdf", "application/pdf", 99),
      file("big.png", "image/png", 99),
      file("kept.png"),
      file("extra.png"),
    ]);

    expect(reasons(onReject.mock.calls[0][0])).toEqual([
      ["both.pdf", "accept"],
      ["big.png", "maxSize"],
      ["extra.png", "maxFiles"],
    ]);
    unmount();
  });

  it("reports an all-rejected single file, and still leaves the field alone", () => {
    const onReject = vi.fn();
    const onChange = vi.fn();
    const held = file("held.png");
    const { host, unmount } = mount(
      <FileUpload value={[held]} multiple={false} accept="image/*" onReject={onReject} onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("nope.pdf", "application/pdf")]);

    expect(onChange).toHaveBeenCalledWith([held]);
    expect(reasons(onReject.mock.calls[0][0])).toEqual([["nope.pdf", "accept"]]);
    unmount();
  });

  it("reports the extra files of a batch dropped on a single-file field as maxFiles", () => {
    // The field shape is "holds one", so the rest were refused by a cap of one.
    const onReject = vi.fn();
    const { host, unmount } = mount(
      <FileUpload multiple={false} onReject={onReject}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("first.png"), file("second.png")]);

    expect(reasons(onReject.mock.calls[0][0])).toEqual([["second.png", "maxFiles"]]);
    unmount();
  });

  it("does not report the file a single-file field replaced", () => {
    // Choosing again moves the selection; the old file was not refused.
    const onReject = vi.fn();
    const { host, unmount } = mount(
      <FileUpload value={[file("old.png")]} multiple={false} onReject={onReject}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("new.png")]);

    expect(onReject).not.toHaveBeenCalled();
    unmount();
  });

  it("stays quiet when nothing was refused", () => {
    const onReject = vi.fn();
    const { host, unmount } = mount(
      <FileUpload accept="image/*" maxSize={10} maxFiles={5} onReject={onReject}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("ok.png")]);

    expect(onReject).not.toHaveBeenCalled();
    unmount();
  });

  it("hands over plain JSON, so an agent or a log can carry it", () => {
    const onReject = vi.fn();
    const { host, unmount } = mount(
      <FileUpload maxSize={10} onReject={onReject}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("big.png", "image/png", 11)]);

    const [rejections] = onReject.mock.calls[0];
    expect(JSON.parse(JSON.stringify(rejections))).toEqual([
      { name: "big.png", size: 11, type: "image/png", reason: "maxSize" },
    ]);
    expect(rejections).toEqual([{ name: "big.png", size: 11, type: "image/png", reason: "maxSize" }]);
    unmount();
  });

  it("changes nothing for a host not using it", () => {
    const onChange = vi.fn();
    const { host, unmount } = mount(
      <FileUpload accept="image/*" maxFiles={1} onChange={onChange}>
        <FileUpload.Dropzone />
      </FileUpload>,
    );

    drop(host, [file("a.pdf", "application/pdf"), file("b.png"), file("c.png")]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].map((f: File) => f.name)).toEqual(["b.png"]);
    unmount();
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FileUpload } from "../src/components/FileUpload";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * FileUpload painted its copy, meta and icons with bare `text-zinc-*`, so an
 * app that maps `--fancy-text-muted` (as PS Mapper does, on a #0A2347 surface)
 * themed every other component and left this one grey: the dropzone hint
 * measured 3.23:1 there, failing even AA. Every text colour it renders must go
 * through a `--fancy-text-*` token, in every state it can be in.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function file(name: string, type = "text/plain", size = 2048) {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

/** Every bare palette text colour, ignoring a token's own fallback. */
function bareTextColours(host: HTMLElement): string[] {
  const out: string[] = [];
  for (const el of host.querySelectorAll<Element>("*")) {
    const cls = (el.getAttribute("class") ?? "").replace(/var\(--fancy-[a-z-]+,[^)\]]*\)?\)/g, "");
    for (const m of cls.matchAll(/(?:^|\s)((?:[a-z-]+:)*text-(?:zinc|gray|slate|neutral|stone)-\d{2,3})(?=\s|$)/g)) {
      out.push(`${el.tagName.toLowerCase()}: ${m[1]}`);
    }
  }
  return out;
}

const cls = (el: Element | null | undefined) => el?.getAttribute("class") ?? "";

const hint = (host: HTMLElement) => host.querySelector("[data-react-fancy-file-upload-browse] span");

describe("FileUpload text colours come from --fancy-text-* tokens", () => {
  it("idle dropzone: hint uses the muted token in both modes, its icon is themed", () => {
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    expect(bareTextColours(host)).toEqual([]);
    expect(cls(hint(host))).toContain("text-[color:var(--fancy-text-muted,var(--color-zinc-500))]");
    expect(cls(hint(host))).toContain("dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]");
    const icon = host.querySelector("[data-react-fancy-file-upload-browse] svg");
    expect(cls(icon)).toMatch(/text-\[color:var\(--fancy-text-[a-z]+,/);
    expect(cls(icon)).toMatch(/dark:text-\[color:var\(--fancy-text-[a-z]+-dark,/);
    unmount();
  });

  it("drag-over dropzone: still no bare grey, and the hint stays themed", () => {
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    const zone = host.querySelector("[data-react-fancy-file-upload-dropzone]")!;
    act(() => {
      zone.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
    });
    expect(zone.hasAttribute("data-drag-over")).toBe(true);
    expect(bareTextColours(host)).toEqual([]);
    expect(cls(hint(host))).toMatch(/(?:^|\s)text-\[color:var\(--fancy-text-[a-z]+,/);
    expect(cls(hint(host))).toMatch(/dark:text-\[color:var\(--fancy-text-[a-z]+-dark,/);
    unmount();
  });

  it("after a rejection (onReject): no bare grey anywhere", () => {
    let rejected = 0;
    const { host, unmount } = mount(
      <FileUpload accept="image/*" onReject={(r) => (rejected += r.length)}>
        <FileUpload.Dropzone />
        <FileUpload.List />
      </FileUpload>,
    );
    const zone = host.querySelector("[data-react-fancy-file-upload-dropzone]")!;
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: { files: [file("notes.txt")] } });
    act(() => {
      zone.dispatchEvent(event);
    });
    expect(rejected).toBe(1);
    expect(bareTextColours(host)).toEqual([]);
    unmount();
  });

  it("list: size meta and the remove button use tokens, hover included", () => {
    const { host, unmount } = mount(
      <FileUpload value={[file("report.pdf", "application/pdf")]}>
        <FileUpload.List />
      </FileUpload>,
    );
    expect(bareTextColours(host)).toEqual([]);
    const meta = [...host.querySelectorAll("li span")].find((s) => s.textContent === "2.0 KB");
    expect(cls(meta)).toContain("text-[color:var(--fancy-text-muted,var(--color-zinc-500))]");
    expect(cls(meta)).toContain("dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]");
    const remove = host.querySelector('li button[aria-label="Remove report.pdf"]');
    expect(cls(remove)).toContain("text-[color:var(--fancy-text-muted,var(--color-zinc-500))]");
    expect(cls(remove)).toContain("dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]");
    expect(cls(remove)).toContain("hover:text-[color:var(--fancy-text-soft,var(--color-zinc-700))]");
    expect(cls(remove)).toContain("dark:hover:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]");
    const icon = host.querySelector("li svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(cls(icon)).toMatch(/dark:text-\[color:var\(--fancy-text-[a-z]+-dark,/);
    unmount();
  });

  it("thumbnail list: name and extension use tokens; remove is visible on keyboard focus", () => {
    const { host, unmount } = mount(
      <FileUpload value={[file("data.csv", "text/csv")]}>
        <FileUpload.List thumbnail />
      </FileUpload>,
    );
    expect(bareTextColours(host)).toEqual([]);
    const ext = [...host.querySelectorAll("span")].find((s) => s.textContent === "CSV");
    const name = [...host.querySelectorAll("span")].find((s) => s.textContent === "data.csv");
    for (const el of [ext, name]) {
      expect(cls(el)).toMatch(/(?:^|\s)text-\[color:var\(--fancy-text-muted,/);
      expect(cls(el)).toMatch(/dark:text-\[color:var\(--fancy-text-muted-dark,/);
    }
    // The remove button is opacity-0 until the tile is hovered; a keyboard user
    // tabbing onto it must see it too.
    expect(cls(host.querySelector('button[aria-label="Remove data.csv"]'))).toContain("focus-visible:opacity-100");
    unmount();
  });
});

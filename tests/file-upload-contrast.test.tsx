// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FileUpload } from "../src/components/FileUpload";
import { contrast, defaultColourOf } from "./contrast-helper";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Default contrast of everything FileUpload writes, for an app that sets NO
 * `--fancy-*` variables. Colours are read off the rendered classes (a token's
 * fallback, or a bare palette class), so this measures what ships rather than
 * what a comment says ships.
 *
 * Surfaces are the kit's defaults: `var(--fancy-surface, white)` and
 * `var(--fancy-surface-dark, zinc-900)`, the fallbacks every surfaced
 * component uses. Where FileUpload paints its own fill (drag-over, the
 * thumbnail tile), that fill is read off the class too.
 *
 * Bars: readable text >= 4.5:1 (AA), and >= 7:1 (AAA) wherever the kit's own
 * muted token reaches 7:1 on that surface — it does not today (4.83 light,
 * 6.75 dark), which is a token finding and not FileUpload's to change.
 * The remove control is an icon with no text, so it owes 3:1 (WCAG 1.4.11).
 */

const SURFACE = { light: "white", dark: "zinc-900" } as const;
const MUTED = { light: "var(--color-zinc-500)", dark: "var(--color-zinc-400)" } as const;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

function file(name: string, type: string, size = 2048) {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

const cls = (el: Element | null | undefined) => el?.getAttribute("class") ?? "";

/** Default foreground per mode. No `dark:` class means the light one paints in dark too. */
function fg(el: Element | null | undefined, hover = false) {
  const c = cls(el);
  const light = defaultColourOf(c, hover ? "hover:" : "") ?? (hover ? defaultColourOf(c, "") : null);
  const dark =
    defaultColourOf(c, hover ? "dark:hover:" : "dark:") ??
    (hover ? defaultColourOf(c, "dark:") : null) ??
    light;
  if (!light || !dark) throw new Error(`no text colour on <${el?.tagName}> "${c}"`);
  return { light, dark };
}

function bg(el: Element | null | undefined) {
  const c = cls(el);
  return {
    light: defaultColourOf(c, "", "bg") ?? SURFACE.light,
    dark: defaultColourOf(c, "dark:", "bg") ?? SURFACE.dark,
  };
}

function expectText(label: string, f: { light: string; dark: string }, b: { light: string; dark: string }) {
  for (const mode of ["light", "dark"] as const) {
    const ratio = contrast(f[mode], b[mode]);
    const bar = Math.max(4.5, Math.min(7, contrast(MUTED[mode], b[mode])));
    expect(ratio, `${label} (${mode}): ${f[mode]} on ${b[mode]} = ${ratio.toFixed(2)}:1, bar ${bar.toFixed(2)}`).toBeGreaterThanOrEqual(bar);
  }
}

describe("FileUpload default contrast", () => {
  it("dropzone hint, idle", () => {
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    expectText("hint", fg(host.querySelector("[data-react-fancy-file-upload-browse] span")), SURFACE);
    unmount();
  });

  it("dropzone hint, drag-over (on the zone's own drag fill)", () => {
    const { host, unmount } = mount(
      <FileUpload>
        <FileUpload.Dropzone />
      </FileUpload>,
    );
    const zone = host.querySelector("[data-react-fancy-file-upload-dropzone]")!;
    act(() => {
      zone.dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
    });
    expectText("hint on drag", fg(host.querySelector("[data-react-fancy-file-upload-browse] span")), bg(zone));
    unmount();
  });

  it("list: size meta is readable, the remove icon clears 3:1 at rest and on hover", () => {
    const { host, unmount } = mount(
      <FileUpload value={[file("report.pdf", "application/pdf")]}>
        <FileUpload.List />
      </FileUpload>,
    );
    const meta = [...host.querySelectorAll("li span")].find((s) => s.textContent === "2.0 KB");
    expectText("size meta", fg(meta), SURFACE);
    const remove = host.querySelector('li button[aria-label="Remove report.pdf"]');
    for (const hover of [false, true]) {
      const f = fg(remove, hover);
      for (const mode of ["light", "dark"] as const) {
        const ratio = contrast(f[mode], SURFACE[mode]);
        expect(ratio, `remove${hover ? " hover" : ""} (${mode}) = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
      }
    }
    unmount();
  });

  it("thumbnail: file name on the page, extension on the tile", () => {
    const { host, unmount } = mount(
      <FileUpload value={[file("data.csv", "text/csv")]}>
        <FileUpload.List thumbnail />
      </FileUpload>,
    );
    const ext = [...host.querySelectorAll("span")].find((s) => s.textContent === "CSV")!;
    const name = [...host.querySelectorAll("span")].find((s) => s.textContent === "data.csv");
    expectText("thumbnail name", fg(name), SURFACE);
    // The tile is the extension label's nearest painted ancestor.
    const tile = ext.closest(".rounded-lg");
    expectText("extension", fg(ext), bg(tile));
    unmount();
  });
});

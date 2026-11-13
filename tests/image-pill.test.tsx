// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { ImagePill } from "../src/components/ImagePill";
import * as barrel from "../src";
import { PromptInput } from "../src/components/PromptInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * ImagePill: the composer's image attachment pill, exported, so an app can show
 * the same pill on a SENT message in a thread. It is the pill PromptInput (and
 * Composer) draw for a pasted image, with its hover thumbnail, and it opens on
 * keyboard focus too, closes on Escape, and can fetch its thumbnail lazily.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

const realCreate = URL.createObjectURL;
const realRevoke = URL.revokeObjectURL;

beforeEach(() => {
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:fancy-test/${++n}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  URL.createObjectURL = realCreate;
  URL.revokeObjectURL = realRevoke;
  vi.useRealTimers();
});

const pill = () => document.querySelector<HTMLElement>("[data-react-fancy-image-pill]")!;
const preview = () => document.querySelector<HTMLElement>("[data-react-fancy-image-pill-preview]");

function hover(el: Element) {
  vi.useFakeTimers();
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(500);
  });
  vi.useRealTimers();
}

function escape() {
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("ImagePill", () => {
  it("is exported from the barrel", () => {
    expect((barrel as Record<string, unknown>).ImagePill).toBe(ImagePill);
  });

  it("renders the label as a focusable, named image with stable handles", () => {
    mount(<ImagePill label="screenshot.png" src="https://example.com/a.png" data-message-id="m1" />);
    expect(pill().textContent).toBe("screenshot.png");
    expect(pill().getAttribute("role")).toBe("img");
    expect(pill().getAttribute("aria-label")).toBe("screenshot.png");
    expect(pill().tabIndex).toBe(0);
    expect(pill().getAttribute("data-state")).toBe("closed");
    // The host's own handle reaches the pill itself.
    expect(pill().getAttribute("data-message-id")).toBe("m1");
  });

  it("opens its thumbnail on hover", () => {
    mount(<ImagePill label="shot" src="https://example.com/a.png" />);
    hover(pill());
    expect(pill().getAttribute("data-state")).toBe("open");
    const img = preview()!.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("https://example.com/a.png");
    expect(img.getAttribute("alt")).toBe("shot");
  });

  it("opens on keyboard focus, and Escape closes it", () => {
    mount(<ImagePill label="shot" src="https://example.com/a.png" />);
    act(() => pill().focus());
    expect(preview()).not.toBeNull();
    escape();
    expect(preview()).toBeNull();
    expect(pill().getAttribute("data-state")).toBe("closed");
  });

  it("blur closes it", () => {
    mount(<ImagePill label="shot" src="https://example.com/a.png" />);
    act(() => pill().focus());
    act(() => pill().blur());
    expect(preview()).toBeNull();
  });

  it("is controlled: open and onOpenChange", () => {
    const onOpenChange = vi.fn();
    const { rerender } = mount(
      <ImagePill label="shot" src="https://example.com/a.png" open={false} onOpenChange={onOpenChange} />,
    );
    act(() => pill().focus());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // The host did not open it, so it stays shut.
    expect(preview()).toBeNull();

    rerender(<ImagePill label="shot" src="https://example.com/a.png" open onOpenChange={onOpenChange} />);
    expect(preview()).not.toBeNull();
  });

  it("makes its thumbnail from a File while open, and revokes it", () => {
    const file = new File([new Uint8Array([1])], "a.png", { type: "image/png" });
    mount(<ImagePill label="a.png" file={file} />);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    act(() => pill().focus());
    expect(preview()!.querySelector("img")!.getAttribute("src")).toMatch(/^blob:fancy-test\//);
    act(() => pill().blur());
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("an image that fails to load falls back to the label", () => {
    mount(<ImagePill label="shot" src="https://example.com/broken.png" />);
    act(() => pill().focus());
    act(() => {
      preview()!.querySelector("img")!.dispatchEvent(new Event("error"));
    });
    expect(preview()!.querySelector("img")).toBeNull();
    expect(preview()!.textContent).toContain("shot");
    expect(pill().getAttribute("data-thumbnail")).toBe("error");
  });
});

describe("ImagePill loadThumbnail", () => {
  it("is called once, on first hover or focus, with a loading state, then shows the image", async () => {
    let resolve!: (url: string) => void;
    const loadThumbnail = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    mount(<ImagePill label="sent.png" loadThumbnail={loadThumbnail} />);

    expect(loadThumbnail).not.toHaveBeenCalled();
    expect(pill().getAttribute("data-thumbnail")).toBe("idle");

    act(() => pill().focus());
    expect(loadThumbnail).toHaveBeenCalledTimes(1);
    expect(pill().getAttribute("data-thumbnail")).toBe("loading");
    expect(preview()!.querySelector("[data-react-fancy-image-pill-loading]")).not.toBeNull();
    expect(preview()!.getAttribute("aria-busy")).toBe("true");

    resolve("https://example.com/thumb.png");
    await flush();
    expect(pill().getAttribute("data-thumbnail")).toBe("ready");
    expect(preview()!.querySelector("img")!.getAttribute("src")).toBe("https://example.com/thumb.png");

    act(() => pill().blur());
    act(() => pill().focus());
    hover(pill());
    expect(loadThumbnail).toHaveBeenCalledTimes(1);
  });

  it("hover triggers it too", () => {
    const loadThumbnail = vi.fn(() => Promise.resolve("https://example.com/t.png"));
    mount(<ImagePill label="sent.png" loadThumbnail={loadThumbnail} />);
    hover(pill());
    expect(loadThumbnail).toHaveBeenCalledTimes(1);
  });

  it("a rejection shows the error state, and is not retried", async () => {
    const loadThumbnail = vi.fn(() => Promise.reject(new Error("403")));
    mount(<ImagePill label="sent.png" loadThumbnail={loadThumbnail} labels={{ error: "No preview" }} />);
    act(() => pill().focus());
    await flush();
    expect(pill().getAttribute("data-thumbnail")).toBe("error");
    expect(preview()!.querySelector("[data-react-fancy-image-pill-error]")!.textContent).toBe("No preview");
    act(() => pill().blur());
    act(() => pill().focus());
    expect(loadThumbnail).toHaveBeenCalledTimes(1);
  });

  it("labels translate the loading text", () => {
    mount(
      <ImagePill label="x" loadThumbnail={() => new Promise<string>(() => {})} labels={{ loading: "Cargando" }} />,
    );
    act(() => pill().focus());
    expect(preview()!.textContent).toContain("Cargando");
  });

  it("renders on the server without touching URL or calling the loader", () => {
    const loadThumbnail = vi.fn(() => Promise.resolve("u"));
    const html = renderToString(<ImagePill label="ssr.png" loadThumbnail={loadThumbnail} />);
    expect(html).toContain("ssr.png");
    expect(loadThumbnail).not.toHaveBeenCalled();
  });
});

describe("PromptInput draws its image pill with ImagePill", () => {
  function paste(host: HTMLElement, files: File[]) {
    const input = host.querySelector<HTMLElement>("[data-react-fancy-composer-input]")!;
    const ev = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "clipboardData", {
      value: { getData: () => "", files },
    });
    act(() => {
      input.dispatchEvent(ev);
    });
  }

  it("the composer pill is an ImagePill, with the composer's handle and look unchanged", () => {
    function Host() {
      const [value, setValue] = useState("");
      return (
        <PromptInput
          budgetTokens={100000}
          pasteImages
          value={value}
          onChange={setValue}
          onSubmit={() => {}}
        />
      );
    }
    const { host } = mount(<Host />);
    paste(host, [new File([new Uint8Array([137, 80, 78, 71])], "shot.png", { type: "image/png" })]);

    const el = host.querySelector<HTMLElement>("[data-react-fancy-composer-image-pill]")!;
    expect(el).not.toBeNull();
    expect(el.hasAttribute("data-react-fancy-image-pill")).toBe(true);
    // The look the composer had before the export, class for class.
    expect(el.className).toBe(
      "inline-flex select-none items-center rounded-md px-2 py-0.5 text-xs leading-5 transition-colors bg-rose-100 font-medium text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
    );
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("Pasted image 1");

    act(() => el.focus());
    const p = document.querySelector("[data-react-fancy-composer-paste-pill-preview]");
    expect(p?.querySelector("img")?.getAttribute("src")).toMatch(/^blob:fancy-test\//);
    escape();
    expect(document.querySelector("[data-react-fancy-composer-paste-pill-preview]")).toBeNull();
  });
});

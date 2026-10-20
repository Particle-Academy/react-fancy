// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Composer } from "../src/components/Composer/Composer";
import { PromptInput } from "../src/components/PromptInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  return { host };
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

const input = (host: HTMLElement) =>
  host.querySelector<HTMLElement>("[data-react-fancy-composer-input]")!;

function paste(host: HTMLElement, data: { text?: string; files?: File[] }) {
  const ev = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: {
      getData: (t: string) => (t === "text/plain" ? (data.text ?? "") : ""),
      files: data.files ?? [],
    },
  });
  act(() => {
    input(host).dispatchEvent(ev);
  });
}

const image = () => new File([new Uint8Array([137, 80, 78, 71])], "shot.png", { type: "image/png" });
const WALL = `START${"x".repeat(600)}END`;

function Harness(props: Record<string, unknown>) {
  const [value, setValue] = useState("");
  return (
    <Composer
      pasteThreshold={500}
      pastePlacement="inline"
      pasteImages
      value={value}
      onChange={setValue}
      {...props}
    />
  );
}

function hover(el: Element) {
  vi.useFakeTimers();
  act(() => {
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

const popover = () => document.querySelector<HTMLElement>("[data-react-fancy-popover]");
const preview = () =>
  document.querySelector<HTMLElement>(
    "[data-react-fancy-popover] [data-react-fancy-composer-paste-pill-preview]",
  );

/**
 * The owner, 2026-10-20: "I need to be able to see a thumbnail of a pasted image
 * on hover, right now it shows an empty tooltip. Use popovers not tooltips."
 */
describe("paste pills preview in a Popover", () => {
  it("hovering an image pill shows its thumbnail in a popover, not a tooltip", () => {
    const { host } = mount(<Harness />);
    paste(host, { files: [image()] });

    hover(input(host).querySelector("[data-react-fancy-composer-image-pill]")!);

    expect(document.querySelector("[data-react-fancy-tooltip]")).toBeNull();
    expect(popover()).not.toBeNull();
    const img = preview()?.querySelector("img");
    expect(img?.getAttribute("src")).toMatch(/^blob:fancy-test\//);
    expect(img?.getAttribute("alt")).toBe("Pasted image 1");
  });

  it("hovering a text pill shows the excerpt in a popover", () => {
    const { host } = mount(<Harness />);
    paste(host, { text: WALL });

    hover(input(host).querySelector("[data-react-fancy-composer-paste-pill]")!);

    expect(preview()?.textContent).toContain("START");
    expect(preview()?.textContent).toContain("END");
  });

  it("focusing a text pill opens the preview, blurring closes it (keyboard users)", () => {
    const { host } = mount(<Harness />);
    paste(host, { text: WALL });
    const pill = input(host).querySelector<HTMLElement>("[data-react-fancy-composer-paste-pill]")!;

    act(() => pill.focus());
    expect(preview()?.textContent).toContain("START");

    act(() => pill.blur());
    expect(popover()).toBeNull();
  });

  it("an image pill is focusable and opens its preview on focus", () => {
    const { host } = mount(<Harness />);
    paste(host, { files: [image()] });
    const pill = input(host).querySelector<HTMLElement>("[data-react-fancy-composer-image-pill]")!;

    expect(pill.tabIndex).toBe(0);
    act(() => pill.focus());
    expect(preview()?.querySelector("img")).not.toBeNull();
  });

  it("an image that fails to load falls back to its label, never an empty box", () => {
    const { host } = mount(<Harness />);
    paste(host, { files: [image()] });
    hover(input(host).querySelector("[data-react-fancy-composer-image-pill]")!);

    act(() => {
      preview()!.querySelector("img")!.dispatchEvent(new Event("error"));
    });
    expect(preview()?.querySelector("img")).toBeNull();
    expect(preview()?.textContent).toContain("Pasted image 1");
  });

  it("classNames.preview restyles the popover panel", () => {
    const { host } = mount(<Harness classNames={{ preview: "my-pop" }} />);
    paste(host, { text: WALL });
    hover(input(host).querySelector("[data-react-fancy-composer-paste-pill]")!);

    expect(popover()?.className).toContain("my-pop");
  });

  it("renderPastePreview still replaces the content, inside the popover", () => {
    const { host } = mount(
      <Harness renderPastePreview={(p: { kind: string }) => <em>custom {p.kind}</em>} />,
    );
    paste(host, { files: [image()] });
    hover(input(host).querySelector("[data-react-fancy-composer-image-pill]")!);

    expect(preview()?.querySelector("em")?.textContent).toBe("custom image");
  });

  it("reaches PromptInput, which shares the same pill", () => {
    const { host } = mount(
      <PromptInput budgetTokens={100000} pasteThreshold={500} pasteImages onSubmit={() => {}} />,
    );
    paste(host, { files: [image()] });
    hover(input(host).querySelector("[data-react-fancy-composer-image-pill]")!);

    expect(preview()?.querySelector("img")?.getAttribute("src")).toMatch(/^blob:/);
  });
});

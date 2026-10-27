import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

export function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root: Root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

/** Install a fake `navigator.clipboard`; returns the spies. */
export function fakeClipboard(opts: { write?: boolean; writeTextFails?: boolean; writeFails?: boolean } = {}) {
  const writeText = vi.fn(async (_text: string) => {
    if (opts.writeTextFails) throw new Error("writeText denied");
  });
  const write = vi.fn(async (_items: unknown[]) => {
    if (opts.writeFails) throw new Error("write denied");
  });
  const clipboard: Record<string, unknown> = { writeText };
  if (opts.write) clipboard.write = write;
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
  return { writeText, write };
}

export function removeClipboard() {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
}

/** Click a button and let every pending promise settle. */
export async function click(el: Element) {
  await act(async () => {
    (el as HTMLElement).click();
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

export function liveRegion(host: HTMLElement): HTMLElement | null {
  return host.querySelector("[data-react-fancy-content-renderer-live]");
}

export function copyButtons(host: HTMLElement, kind?: "code" | "table"): HTMLButtonElement[] {
  const sel = kind
    ? `[data-react-fancy-content-copy="${kind}"]`
    : "[data-react-fancy-content-copy]";
  return Array.from(host.querySelectorAll<HTMLButtonElement>(sel));
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  document.body.replaceChildren();
  removeClipboard();
  vi.unstubAllGlobals();
});

// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Input } from "../src/components/inputs/Input";
import { Composer } from "../src/components/Composer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * `Input` holds a long paste as a pill, like `Composer` and `PromptInput`, from
 * the SAME code: the paste-pill core is one folder, `PastePills`, that all three
 * import, so `npx fancy-cli add input` copies it as a dependency rather than a
 * second copy that could drift.
 *
 * A form is the point of an `Input`, so what a native submit posts is asserted
 * here, not just what is on screen: the text with every pill expanded, and every
 * pasted file in a hidden file input in the same form.
 */

/** jsdom has no DataTransfer; this is the part the hidden file input uses. */
class FakeDataTransfer {
  private list: File[] = [];
  items = { add: (f: File) => void this.list.push(f) };
  get files() {
    const files = [...this.list];
    return Object.assign(files, { item: (i: number) => files[i] ?? null }) as unknown as FileList;
  }
}

beforeAll(() => {
  (globalThis as { DataTransfer?: unknown }).DataTransfer = FakeDataTransfer;
  // jsdom's `files` setter insists on a real FileList; record what was set.
  Object.defineProperty(HTMLInputElement.prototype, "files", {
    configurable: true,
    get(this: HTMLInputElement & { _files?: FileList }) {
      return this._files ?? ([] as unknown as FileList);
    },
    set(this: HTMLInputElement & { _files?: FileList }, v: FileList) {
      this._files = v;
    },
  });
});

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
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const WALL = `START${"x".repeat(600)}END`;

function field(host: HTMLElement): HTMLElement {
  return host.querySelector("[data-react-fancy-composer-input]")!;
}

function caretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

function paste(host: HTMLElement, data: { text?: string; files?: File[] }) {
  const ev = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: {
      getData: (t: string) => (t === "text/plain" ? (data.text ?? "") : ""),
      files: data.files ?? [],
    },
  });
  act(() => {
    caretAtEnd(field(host));
    field(host).dispatchEvent(ev);
  });
}

function posted(host: HTMLElement, name: string): string {
  return (host.querySelector(`input[name="${name}"]`) as HTMLInputElement).value;
}

describe("Input paste pills", () => {
  it("is a plain <input> until asked", () => {
    const host = mount(<Input name="q" />);
    expect(host.querySelector("input[name=q]")?.getAttribute("type")).toBe("text");
    expect(field(host)).toBeNull();
  });

  it("holds a long paste as a pill IN the field, and posts its full text", () => {
    const changes: string[] = [];
    const host = mount(
      <form>
        <Input name="q" pasteThreshold={500} onValueChange={(v) => changes.push(v)} />
      </form>,
    );

    paste(host, { text: WALL });

    const pill = field(host).querySelector("[data-react-fancy-composer-paste-host]");
    expect(pill).not.toBeNull();
    // A single-line field has no line to give a pill: it sits in the text.
    expect(field(host).textContent).not.toContain("\n");
    expect(field(host).textContent).not.toContain("START");
    expect(field(host).getAttribute("aria-multiline")).toBe("false");

    expect(posted(host, "q")).toBe(WALL);
    expect(changes.at(-1)).toMatch(/\uFFFCpaste-1\uFFFC/);
  });

  it("puts a short paste in as text, newlines flattened the way an <input> does", () => {
    const host = mount(<Input name="q" pasteThreshold={500} />);
    paste(host, { text: "one\ntwo\r\nthree" });

    expect(posted(host, "q")).toBe("one two three");
    expect(field(host).querySelector("[data-react-fancy-composer-paste-host]")).toBeNull();
  });

  it("submits its form on Enter instead of starting a line", () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    const host = mount(
      <form onSubmit={(e) => onSubmit(e.nativeEvent)}>
        <Input name="q" pasteThreshold={500} />
      </form>,
    );
    const form = host.querySelector("form")!;
    form.requestSubmit = vi.fn();

    act(() => {
      field(host).dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }),
      );
    });

    expect(form.requestSubmit).toHaveBeenCalledTimes(1);
    expect(field(host).textContent).not.toContain("\n");
  });

  it("puts a pasted file in a hidden file input in the same form, and takes it out with its pill", () => {
    const shot = new File(["png"], "shot.png", { type: "image/png" });
    const host = mount(
      <form>
        <Input name="q" pasteImages />
      </form>,
    );
    paste(host, { files: [shot] });

    const files = host.querySelector<HTMLInputElement>('form input[type=file][name="q_files[]"]')!;
    expect(files).not.toBeNull();
    expect(files.hidden).toBe(true);
    expect(Array.from(files.files ?? [])).toEqual([shot]);
    expect(posted(host, "q")).toBe("[Pasted image 1]");

    // Backspacing the pill out of the field detaches the file as well.
    act(() => {
      field(host).querySelector("[data-react-fancy-composer-paste-host]")!.remove();
      field(host).dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(Array.from(files.files ?? [])).toEqual([]);
  });

  it("names the file input as told", () => {
    const host = mount(<Input pasteImages pasteFilesName="attachments[]" />);
    expect(host.querySelector('input[type=file][name="attachments[]"]')).not.toBeNull();
  });

  it("gives Composer the same hidden file input", () => {
    const shot = new File(["png"], "shot.png", { type: "image/png" });
    const host = mount(<Composer pastePlacement="inline" pasteImages pasteFilesName="photos[]" />);
    paste(host, { files: [shot] });

    const files = host.querySelector<HTMLInputElement>('input[type=file][name="photos[]"]')!;
    expect(Array.from(files.files ?? [])).toEqual([shot]);
  });
});

describe("the paste-pill core is shared, not copied", () => {
  const src = (p: string) => resolve(process.cwd(), "src", p);
  const read = (p: string) => readFileSync(src(p), "utf8");

  it("lives in ONE component folder, so fancy-cli vendors it as a dependency", () => {
    for (const f of ["use-paste-pills.ts", "use-inline-paste.tsx", "InlinePasteEditor.tsx", "InlinePill.tsx", "paste-markers.ts", "PastedFilesInput.tsx", "index.ts"]) {
      expect(existsSync(src(`components/PastePills/${f}`)), f).toBe(true);
    }
    // No component keeps a private copy beside it.
    for (const f of ["use-inline-paste.tsx", "InlinePasteEditor.tsx", "InlinePill.tsx", "paste-markers.ts"]) {
      expect(existsSync(src(`components/Composer/${f}`)), `Composer/${f}`).toBe(false);
    }
    expect(read("hooks/use-paste-pills.ts")).not.toContain("useCallback");
  });

  it("is what Composer, PromptInput and Input import", () => {
    expect(read("components/Composer/Composer.tsx")).toMatch(/from "\.\.\/PastePills"/);
    expect(read("components/PromptInput/PromptInput.tsx")).toMatch(/from "\.\.\/PastePills"/);
    expect(read("components/inputs/Input/Input.tsx")).toMatch(/from "\.\.\/\.\.\/PastePills"/);
  });
});

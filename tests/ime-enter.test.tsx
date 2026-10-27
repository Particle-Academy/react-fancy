// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useMemo, useRef, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Composer } from "../src/components/Composer/Composer";
import { PromptInput } from "../src/components/PromptInput/PromptInput";
import { Pillbox } from "../src/components/Pillbox";
import { FileBrowser } from "../src/components/FileBrowser";
import { Command } from "../src/components/Command";
import { Autocomplete } from "../src/components/Autocomplete";
import { Select } from "../src/components/inputs/Select";
import { InputTag } from "../src/components/InputTag";
import { textareaAdapter } from "../src/components/InputTag/adapters";
import { JsonEditor } from "../src/components/JsonEditor/JsonEditor";
import { isImeComposing } from "../src/utils/ime";

/*
 * Confirming an IME composition is an Enter keypress.
 *
 * A Japanese, Chinese or Korean typist presses Enter to accept the candidate
 * they were composing — and every field below treated that keypress as "send"
 * (or "add", "create", "pick", "navigate"). The person meant to finish a word
 * and instead sent half a sentence. Browsers mark that keydown with
 * `isComposing`; Safari fires it AFTER `compositionend` with `isComposing`
 * false but `keyCode` 229, which is why both are checked.
 *
 * Every case pairs the composing Enter with a plain Enter on the same field: a
 * test that only asserts "nothing happened" passes just as well when the event
 * never reached the handler at all.
 */

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
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  document.body.innerHTML = "";
});

type Ime = "composing" | "keyCode229" | "none";

function enter(target: Element, ime: Ime, mods: KeyboardEventInit = {}) {
  const init: KeyboardEventInit & { keyCode?: number } = {
    key: "Enter",
    bubbles: true,
    cancelable: true,
    ...mods,
  };
  if (ime === "composing") init.isComposing = true;
  if (ime === "keyCode229") init.keyCode = 229;
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", init));
  });
}

function typeInto(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const set = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
  act(() => {
    set.call(el, text);
    el.setSelectionRange(text.length, text.length);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Types into the contenteditable the inline editor uses, the way its input handler reads it. */
function typeInline(host: Element, text: string) {
  const editor = host.querySelector<HTMLElement>("[data-react-fancy-composer-input]")!;
  act(() => {
    editor.textContent = text;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return editor;
}

describe("isImeComposing", () => {
  it("reads isComposing and the legacy keyCode 229, on a native or a React event", () => {
    const composing = new KeyboardEvent("keydown", { key: "Enter", isComposing: true });
    const safari = new KeyboardEvent("keydown", { key: "Enter", keyCode: 229 } as KeyboardEventInit);
    const plain = new KeyboardEvent("keydown", { key: "Enter" });

    expect(isImeComposing(composing)).toBe(true);
    expect(isImeComposing(safari)).toBe(true);
    expect(isImeComposing(plain)).toBe(false);
    expect(isImeComposing({ nativeEvent: composing })).toBe(true);
    expect(isImeComposing({ nativeEvent: plain })).toBe(false);
  });
});

describe("Composer", () => {
  it.each(["composing", "keyCode229"] as const)("textarea: Enter while %s does not send", (ime) => {
    const onSubmit = vi.fn();
    const host = mount(<Composer onSubmit={onSubmit} />);
    const ta = host.querySelector("textarea")!;
    typeInto(ta, "こんにちは");

    enter(ta, ime);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(ta.value).toBe("こんにちは");

    enter(ta, "none");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("inline editor: Enter with keyCode 229 does not send", () => {
    const onSubmit = vi.fn();
    const host = mount(<Composer onSubmit={onSubmit} pastePlacement="inline" pasteThreshold={500} />);
    const editor = typeInline(host, "こんにちは");

    enter(editor, "keyCode229");
    expect(onSubmit).not.toHaveBeenCalled();

    enter(editor, "none");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("PromptInput", () => {
  it.each(["composing", "keyCode229"] as const)("textarea: Ctrl+Enter while %s does not send", (ime) => {
    const onSubmit = vi.fn();
    const host = mount(<PromptInput budgetTokens={1000} onSubmit={onSubmit} />);
    const ta = host.querySelector("textarea")!;
    typeInto(ta, "你好");

    enter(ta, ime, { ctrlKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    enter(ta, "none", { ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("textarea: Enter while composing does not pick from the mention menu", () => {
    const host = mount(
      <PromptInput
        budgetTokens={1000}
        onSubmit={() => {}}
        mentions={[{ id: "ada", name: "Ada", kind: "person" }]}
      />,
    );
    const ta = host.querySelector("textarea")!;
    typeInto(ta, "@a");

    enter(ta, "composing");
    expect(ta.value).toBe("@a");

    enter(ta, "none");
    expect(ta.value).toBe("@ada ");
  });

  it("inline editor: Ctrl+Enter with keyCode 229 does not send", () => {
    const onSubmit = vi.fn();
    const host = mount(<PromptInput budgetTokens={1000} pasteThreshold={500} onSubmit={onSubmit} />);
    const editor = typeInline(host, "你好");

    enter(editor, "keyCode229", { ctrlKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    enter(editor, "none", { ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("other fields that commit on Enter", () => {
  it("Pillbox does not add a pill while composing", () => {
    const onChange = vi.fn();
    const host = mount(<Pillbox onChange={onChange} />);
    const input = host.querySelector<HTMLInputElement>("[data-react-fancy-pillbox] input")!;
    typeInto(input, "東京");

    enter(input, "composing");
    expect(onChange).not.toHaveBeenCalled();

    enter(input, "none");
    expect(onChange).toHaveBeenCalledWith(["東京"]);
  });

  it("FileBrowser new-folder input does not create while composing", () => {
    const onCreateFolder = vi.fn();
    mount(
      <FileBrowser
        snapshot={[{ path: "/src", name: "src", kind: "directory", children: [] }]}
        defaultPath="/src"
        onCreateFolder={onCreateFolder}
      />,
    );
    act(() => {
      document.querySelector<HTMLElement>("[data-react-fancy-file-browser-new-folder]")!.click();
    });
    const input = document.querySelector<HTMLInputElement>("[data-react-fancy-file-browser-new-folder-input]")!;
    typeInto(input, "資料");

    enter(input, "composing");
    expect(onCreateFolder).not.toHaveBeenCalled();

    enter(input, "none");
    expect(onCreateFolder).toHaveBeenCalledTimes(1);
  });

  it("FileBrowser path input does not navigate while composing", () => {
    const onPathChange = vi.fn();
    mount(
      <FileBrowser
        snapshot={[
          { path: "/src", name: "src", kind: "directory", children: [] },
          { path: "/docs", name: "docs", kind: "directory", children: [] },
        ]}
        defaultPath="/src"
        onPathChange={onPathChange}
      />,
    );
    act(() => {
      document.querySelector<HTMLElement>('[data-react-fancy-file-browser-path] button[aria-label="Edit path"]')!.click();
    });
    const input = document.querySelector<HTMLInputElement>("[data-react-fancy-file-browser-path-input]")!;
    typeInto(input, "/docs");

    enter(input, "composing");
    expect(document.querySelector("[data-react-fancy-file-browser-path-input]")).not.toBeNull();

    enter(input, "none");
    expect(document.querySelector("[data-react-fancy-file-browser-path-input]")).toBeNull();
  });

  it("Command does not pick while composing", () => {
    const picked: string[] = [];
    mount(
      <Command open onClose={() => {}}>
        <Command.Input />
        <Command.List>
          <Command.Item onSelect={() => picked.push("one")}>one</Command.Item>
        </Command.List>
      </Command>,
    );
    const input = document.querySelector<HTMLInputElement>("[data-react-fancy-command] input")!;

    enter(input, "composing");
    expect(picked).toEqual([]);

    enter(input, "none");
    expect(picked).toEqual(["one"]);
  });

  it("Autocomplete does not select while composing", () => {
    const onChange = vi.fn();
    const host = mount(
      <Autocomplete
        onChange={onChange}
        options={[
          { value: "tokyo", label: "Tokyo" },
          { value: "kyoto", label: "Kyoto" },
        ]}
      />,
    );
    const input = host.querySelector<HTMLInputElement>("[data-react-fancy-autocomplete] input")!;
    typeInto(input, "to");
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    onChange.mockClear();

    enter(input, "composing");
    expect(onChange).not.toHaveBeenCalled();

    enter(input, "none");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("Select (creatable) does not create while composing", () => {
    const onCreate = vi.fn();
    const host = mount(<Select variant="listbox" creatable onCreate={onCreate} list={[{ value: "a", label: "A" }]} />);
    act(() => {
      host.querySelector<HTMLElement>("[data-react-fancy-select]")!.click();
    });
    const input = document.querySelector<HTMLInputElement>('[role="listbox"] input, input[placeholder="Type to add…"]')!;
    typeInto(input, "大阪");

    enter(input, "composing");
    expect(onCreate).not.toHaveBeenCalled();

    enter(input, "none");
    expect(onCreate).toHaveBeenCalledWith("大阪");
  });

  it("InputTag does not insert while composing", () => {
    function Host() {
      const ref = useRef<HTMLTextAreaElement>(null);
      const adapter = useMemo(() => textareaAdapter(ref), []);
      return (
        <>
          <textarea ref={ref} defaultValue="" />
          <InputTag
            adapter={adapter}
            triggers={{ "@": { items: [{ id: "ada", name: "ada" }], insert: (m) => `@${m.name} ` } }}
          />
        </>
      );
    }
    const host = mount(<Host />);
    const ta = host.querySelector("textarea")!;
    typeInto(ta, "@a");

    enter(ta, "composing");
    expect(ta.value).toBe("@a");

    enter(ta, "none");
    expect(ta.value).toBe("@ada ");
  });

  it("JsonEditor value field (commit-on-blur) does not commit while composing", () => {
    // A number field is the commit-on-blur kind: Enter blurs, and blur commits.
    // (A string field commits per keystroke, so Enter means nothing there.)
    const onChange = vi.fn();
    const host = mount(
      <JsonEditor value={{ age: 36 }} keyMap='{"age":"number"}' onChange={onChange} mode="edit" />,
    );
    const input = host.querySelector<HTMLInputElement>('[data-react-fancy-json-editor-value][data-path="age"] input')!;
    act(() => input.focus());
    typeInto(input, "42");

    enter(input, "composing");
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);

    enter(input, "none");
    expect(onChange.mock.calls[0]![0]).toEqual({ age: 42 });
  });

  it("JsonEditor key field does not commit a rename while composing", () => {
    const onChange = vi.fn();
    const host = mount(<JsonEditor value={{ a: 1 }} onChange={onChange} mode="edit" />);
    const input = host.querySelector<HTMLInputElement>('[data-react-fancy-json-editor-key][data-path="a"] input')!;
    act(() => input.focus());
    typeInto(input, "名前");

    enter(input, "composing");
    expect(onChange).not.toHaveBeenCalled();

    enter(input, "none");
    expect(onChange.mock.calls[0]![0]).toEqual({ 名前: 1 });
  });
});

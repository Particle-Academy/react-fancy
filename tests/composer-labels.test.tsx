// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Composer } from "../src/components/Composer/Composer";
import type { ComposerLabels } from "../src/index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Composer `labels`: every string the component draws or announces is
 * overridable, the way PromptInput, ContentReaction and ImagePill already are.
 * Before, the send button's "Send", the paste pills' "Pasted text · N
 * characters" / "Insert this pasted text…" / "Discard this pasted text", the
 * "Pasted image N" image label and the "Message not sent" announcement were
 * hard-coded English. Defaults stay English.
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
  return host;
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const ES: ComposerLabels = {
  placeholder: "Escribe un mensaje…",
  send: "Enviar",
  sendAriaLabel: "Enviar mensaje",
  sending: "Enviando…",
  notSent: "Mensaje no enviado. Se ha conservado.",
  notSentDetail: "Mensaje no enviado: {error}",
  pastedText: "Texto pegado · {count} caracteres",
  insertPaste: "Insertar este texto pegado, {count} caracteres",
  insertNamedPaste: "Insertar este texto pegado: {label}, {count} caracteres",
  discardPaste: "Descartar este texto pegado",
  pastedImage: "Imagen pegada {n}",
};

const send = (host: HTMLElement) => host.querySelector<HTMLButtonElement>("[data-react-fancy-composer-send]")!;

function typeInto(host: HTMLElement, text: string) {
  const textarea = host.querySelector("textarea")!;
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setValue.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function pasteInto(target: Element, data: { text?: string; files?: File[] }) {
  const ev = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: {
      getData: (t: string) => (t === "text/plain" || t === "text" ? (data.text ?? "") : ""),
      files: data.files ?? [],
    },
  });
  act(() => {
    target.dispatchEvent(ev);
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("Composer labels: defaults stay English", () => {
  it("Send, the placeholder, and no aria-label (the text names the button)", () => {
    const host = mount(<Composer />);
    expect(send(host).textContent).toBe("Send");
    expect(send(host).hasAttribute("aria-label")).toBe(false);
    expect(host.querySelector("textarea")!.placeholder).toBe("Type a message...");
  });

  it("the paste pill above the input", () => {
    const host = mount(<Composer pasteThreshold={10} />);
    pasteInto(host.querySelector("textarea")!, { text: "x".repeat(2036) });
    const pill = host.querySelector("[data-react-fancy-composer-paste-pill]")!;
    expect(pill.textContent).toBe("Pasted text · 2,036 characters");
    expect(pill.getAttribute("aria-label")).toBe("Insert this pasted text, 2,036 characters");
    expect(host.querySelector("[data-react-fancy-composer-paste-pill-remove]")!.getAttribute("aria-label")).toBe(
      "Discard this pasted text",
    );
  });
});

describe("Composer labels: every built-in string is overridable", () => {
  it("the send button's visible text and its accessible name", () => {
    const host = mount(<Composer labels={ES} />);
    expect(send(host).textContent).toBe("Enviar");
    expect(send(host).getAttribute("aria-label")).toBe("Enviar mensaje");
  });

  it("the placeholder (an explicit `placeholder` prop still wins)", () => {
    const host = mount(<Composer labels={ES} />);
    expect(host.querySelector("textarea")!.placeholder).toBe("Escribe un mensaje…");
    const other = mount(<Composer labels={ES} placeholder="Prop wins" />);
    expect(other.querySelector("textarea")!.placeholder).toBe("Prop wins");
  });

  it("the busy state: the send button reads `sending` while a send is in flight", async () => {
    let resolve!: () => void;
    const host = mount(
      <Composer labels={ES} onSubmit={() => new Promise<void>((r) => (resolve = r))} />,
    );
    typeInto(host, "hola");
    act(() => send(host).click());
    expect(send(host).getAttribute("aria-busy")).toBe("true");
    expect(send(host).textContent).toBe("Enviando…");
    resolve();
    await flush();
    expect(send(host).textContent).toBe("Enviar");
  });

  it("the not-sent announcement, with and without the host's error", async () => {
    const host = mount(<Composer labels={ES} onSubmit={() => Promise.reject(new Error("x"))} />);
    typeInto(host, "hola");
    act(() => send(host).click());
    await flush();
    expect(host.querySelector("[data-react-fancy-composer-error]")!.textContent).toBe(
      "Mensaje no enviado. Se ha conservado.",
    );

    const other = mount(<Composer labels={ES} onSubmit={async () => ({ ok: false, error: "sin red" })} />);
    typeInto(other, "hola");
    act(() => send(other).click());
    await flush();
    expect(other.querySelector("[data-react-fancy-composer-error]")!.textContent).toBe("Mensaje no enviado: sin red");
  });

  it("the paste pill above the input: its text, its name and the discard button", () => {
    const host = mount(<Composer labels={ES} pasteThreshold={10} />);
    pasteInto(host.querySelector("textarea")!, { text: "x".repeat(2036) });
    const pill = host.querySelector("[data-react-fancy-composer-paste-pill]")!;
    expect(pill.textContent).toBe("Texto pegado · 2,036 caracteres");
    expect(pill.getAttribute("aria-label")).toBe("Insertar este texto pegado, 2,036 caracteres");
    expect(host.querySelector("[data-react-fancy-composer-paste-pill-remove]")!.getAttribute("aria-label")).toBe(
      "Descartar este texto pegado",
    );
  });

  it("inline pills: a text pill, a named text pill and an image pill", () => {
    function Harness() {
      const [value, setValue] = useState("");
      return (
        <Composer
          labels={ES}
          pastePlacement="inline"
          pasteThreshold={10}
          pasteImages
          value={value}
          onChange={setValue}
        />
      );
    }
    const host = mount(<Harness />);
    const editor = host.querySelector("[data-react-fancy-composer-input]")!;
    pasteInto(editor, { text: "y".repeat(1200) });
    const pill = host.querySelector("[data-react-fancy-composer-paste-pill]")!;
    expect(pill.textContent).toBe("Texto pegado · 1,200 caracteres");
    expect(pill.getAttribute("aria-label")).toBe("Insertar este texto pegado, 1,200 caracteres");

    pasteInto(editor, { files: [new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" })] });
    expect(host.querySelector("[data-react-fancy-composer-image-pill]")!.textContent).toBe("Imagen pegada 1");
  });

  it("an inline text pill the host named uses insertNamedPaste", () => {
    const held = [{ id: "p1", text: "z".repeat(40), label: "notes.md" }];
    const host = mount(
      <Composer
        labels={ES}
        pastePlacement="inline"
        pasteThreshold={10}
        heldPastes={held}
        value={`￼p1￼`}
      />,
    );
    const pill = host.querySelector("[data-react-fancy-composer-paste-pill]")!;
    expect(pill.textContent).toBe("notes.md");
    expect(pill.getAttribute("aria-label")).toBe("Insertar este texto pegado: notes.md, 40 caracteres");
  });
});

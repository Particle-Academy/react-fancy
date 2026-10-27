// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Composer } from "../src/components/Composer/Composer";
import type { SubmitResult } from "../src/components/Composer";

/*
 * An acknowledged send.
 *
 * `onSubmit` used to be fire-and-forget: Composer called it and cleared the
 * text on the next line. A host whose send could FAIL (a network call, a rate
 * limit, a server that says no) had already lost the person's message by the
 * time it knew. Returning a Promise now means "keep it until I say it went".
 *
 * A void `onSubmit` is untouched, and the existing Composer suites prove it.
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
});

function deferred() {
  let resolve!: (v: SubmitResult) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<SubmitResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function typeInto(ta: HTMLTextAreaElement, text: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    set.call(ta, text);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function enter(el: Element) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  });
}

function paste(ta: HTMLTextAreaElement, text: string) {
  const ev = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "clipboardData", {
    value: { getData: (t: string) => (t === "text/plain" || t === "text" ? text : ""), files: [] },
  });
  act(() => {
    ta.dispatchEvent(ev);
  });
}

const root = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-composer]")!;
const textarea = (host: Element) => host.querySelector("textarea")!;
const send = (host: Element) => host.querySelector<HTMLButtonElement>("[data-react-fancy-composer-send]")!;
const errorRegion = (host: Element) => host.querySelector<HTMLElement>("[data-react-fancy-composer-error]");
const pills = (host: Element) => host.querySelectorAll("[data-react-fancy-composer-paste-pill]");

async function settle(fn: () => void) {
  await act(async () => {
    fn();
  });
}

describe("Composer — a Promise from onSubmit holds the message until it is acknowledged", () => {
  it("keeps the text, marks the send busy and blocks a second send while pending", () => {
    const pending = deferred();
    const onSubmit = vi.fn(() => pending.promise);
    const host = mount(<Composer onSubmit={onSubmit} />);

    typeInto(textarea(host), "hello");
    enter(textarea(host));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(textarea(host).value).toBe("hello");
    expect(send(host).disabled).toBe(true);
    expect(send(host).getAttribute("aria-busy")).toBe("true");
    expect(root(host).getAttribute("data-submit-state")).toBe("submitting");
    // Editable by default: the person can keep typing while it sends.
    expect(textarea(host).disabled).toBe(false);

    enter(textarea(host));
    act(() => send(host).click());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("clears exactly as before once the Promise resolves", async () => {
    const pending = deferred();
    const host = mount(<Composer onSubmit={() => pending.promise} pasteThreshold={10} />);

    typeInto(textarea(host), "question");
    paste(textarea(host), "a long pasted document");
    expect(pills(host)).toHaveLength(1);
    enter(textarea(host));
    expect(pills(host)).toHaveLength(1);

    await settle(() => pending.resolve());

    expect(textarea(host).value).toBe("");
    expect(pills(host)).toHaveLength(0);
    expect(send(host).getAttribute("aria-busy")).toBeNull();
    expect(root(host).hasAttribute("data-submit-state")).toBe(false);
  });

  it("keeps everything and reports an { ok: false } result", async () => {
    const pending = deferred();
    const onSubmitError = vi.fn();
    const host = mount(
      <Composer onSubmit={() => pending.promise} onSubmitError={onSubmitError} pasteThreshold={10} />,
    );

    typeInto(textarea(host), "question");
    paste(textarea(host), "a long pasted document");
    enter(textarea(host));
    await settle(() => pending.resolve({ ok: false, error: "Rate limited" }));

    expect(textarea(host).value).toBe("question");
    expect(pills(host)).toHaveLength(1);
    expect(onSubmitError).toHaveBeenCalledWith("Rate limited");
    expect(root(host).getAttribute("data-submit-state")).toBe("error");
    expect(send(host).disabled).toBe(false);
    expect(send(host).getAttribute("aria-busy")).toBeNull();

    const region = errorRegion(host)!;
    expect(region.getAttribute("role")).toBe("alert");
    expect(region.textContent).toContain("Rate limited");
    // Visually hidden by inline style, so it never depends on the host's Tailwind build.
    expect(region.style.position).toBe("absolute");
    expect(region.style.width).toBe("1px");
  });

  it("keeps everything and reports a rejection", async () => {
    const pending = deferred();
    const onSubmitError = vi.fn();
    const host = mount(<Composer onSubmit={() => pending.promise} onSubmitError={onSubmitError} />);

    typeInto(textarea(host), "hello");
    enter(textarea(host));
    const boom = new Error("offline");
    await settle(() => pending.reject(boom));

    expect(textarea(host).value).toBe("hello");
    expect(onSubmitError).toHaveBeenCalledWith(boom);
    expect(errorRegion(host)!.textContent).toMatch(/not sent/i);
    expect(send(host).disabled).toBe(false);
  });

  it("a retry after a failure clears the error and can succeed", async () => {
    const first = deferred();
    const second = deferred();
    const queue = [first, second];
    const host = mount(<Composer onSubmit={() => queue.shift()!.promise} />);

    typeInto(textarea(host), "hello");
    enter(textarea(host));
    await settle(() => first.resolve({ ok: false }));
    expect(errorRegion(host)).not.toBeNull();

    enter(textarea(host));
    expect(errorRegion(host)).toBeNull();
    await settle(() => second.resolve());
    expect(textarea(host).value).toBe("");
  });

  it("does not throw away what the person typed while the send was in flight", async () => {
    const pending = deferred();
    const host = mount(<Composer onSubmit={() => pending.promise} />);

    typeInto(textarea(host), "hello");
    enter(textarea(host));
    typeInto(textarea(host), "hello — and another thing");
    await settle(() => pending.resolve());

    expect(textarea(host).value).toBe("hello — and another thing");
  });

  it("a controlled host keeps authority: the clear arrives as onChange('')", async () => {
    const pending = deferred();
    const seen: string[] = [];
    function Host() {
      const [value, setValue] = useState("");
      return (
        <Composer
          value={value}
          onChange={(v) => {
            seen.push(v);
            setValue(v);
          }}
          onSubmit={() => pending.promise}
        />
      );
    }
    const host = mount(<Host />);

    typeInto(textarea(host), "hello");
    enter(textarea(host));
    expect(seen).toEqual(["hello"]);
    await settle(() => pending.resolve());

    expect(seen).toEqual(["hello", ""]);
    expect(textarea(host).value).toBe("");
  });
});

describe("Composer — sendDisabled", () => {
  it("disables only the send: the text stays editable and Enter does not send", () => {
    const onSubmit = vi.fn();
    const host = mount(<Composer onSubmit={onSubmit} sendDisabled />);

    typeInto(textarea(host), "drafting");
    expect(textarea(host).disabled).toBe(false);
    expect(textarea(host).value).toBe("drafting");
    expect(send(host).disabled).toBe(true);

    enter(textarea(host));
    act(() => send(host).click());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea(host).value).toBe("drafting");
  });
});

describe("Composer — a stable, named text field", () => {
  it("textarea carries name, id and the data handle", () => {
    const host = mount(<Composer name="message" inputId="chat-message" />);
    const ta = textarea(host);

    expect(ta.name).toBe("message");
    expect(ta.id).toBe("chat-message");
    expect(ta.hasAttribute("data-react-fancy-composer-textarea")).toBe(true);
  });

  it("inline placement: the editor takes the id, a hidden field carries the sent text under name", () => {
    const host = mount(<Composer name="message" inputId="chat-message" pastePlacement="inline" pasteThreshold={500} />);
    const editor = host.querySelector<HTMLElement>("[data-react-fancy-composer-input]")!;
    expect(editor.id).toBe("chat-message");

    act(() => {
      editor.textContent = "hello";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const field = host.querySelector<HTMLInputElement>('input[type="hidden"][name="message"]')!;
    expect(field.value).toBe("hello");
  });
});

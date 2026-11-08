// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Pillbox } from "../src/components/Pillbox";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Pillbox, 6.17.1: the text input had no accessible name (WCAG 1.3.1 /
 * 4.1.2) and nothing could link a validation message to it. Each block below
 * failed on 6.17.0.
 */

const roots: Root[] = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(el));
  return host;
}

afterEach(() => {
  for (const r of roots.splice(0)) act(() => r.unmount());
  document.body.innerHTML = "";
});

const input = (host: HTMLElement) =>
  host.querySelector<HTMLInputElement>("[data-react-fancy-pillbox] input")!;

/** The name a `<label for>` gives the input: its labels' text, joined. */
function labelName(el: HTMLInputElement): string {
  return [...(el.labels ?? [])].map((l) => l.textContent?.trim() ?? "").join(" ");
}

/** The text of every element `aria-describedby` points at, in order. */
function describedText(el: HTMLElement): string[] {
  const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
  return ids.map((id) => document.getElementById(id)?.textContent ?? `<missing #${id}>`);
}

function typeInto(el: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function key(el: Element, k: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
}

const status = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[data-react-fancy-pillbox-status][aria-live="polite"]');

describe("Pillbox: accessible name", () => {
  it("names the input from `label`", () => {
    const host = mount(<Pillbox label="Tags" />);
    expect(labelName(input(host))).toBe("Tags");
  });

  it("still names the input with `labelHidden`, and hides the label visually", () => {
    const host = mount(<Pillbox label="Tags" labelHidden />);
    const el = input(host);
    expect(labelName(el)).toBe("Tags");
    expect(el.labels![0].className).toContain("sr-only");
  });

  it("uses a given `id` for the input", () => {
    const host = mount(<Pillbox label="Tags" id="my-tags" />);
    expect(input(host).id).toBe("my-tags");
    expect(labelName(input(host))).toBe("Tags");
  });
});

describe("Pillbox: description and error", () => {
  it("links the description through aria-describedby", () => {
    const host = mount(<Pillbox label="Tags" description="Press Enter to add" />);
    expect(describedText(input(host))).toEqual(["Press Enter to add"]);
    expect(input(host).hasAttribute("aria-invalid")).toBe(false);
  });

  it("links the error through aria-describedby and sets aria-invalid", () => {
    const host = mount(<Pillbox label="Tags" error="Add at least one tag" />);
    const el = input(host);
    expect(describedText(el)).toEqual(["Add at least one tag"]);
    expect(el.getAttribute("aria-invalid")).toBe("true");
  });

  it("marks the input required", () => {
    const host = mount(<Pillbox label="Tags" required />);
    expect(input(host).getAttribute("aria-required")).toBe("true");
  });
});

describe("Pillbox: remove buttons and announcements", () => {
  it("names each remove button 'Remove {tag}'", () => {
    const host = mount(<Pillbox defaultValue={["alpha", "beta"]} />);
    const names = [...host.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Remove alpha", "Remove beta"]);
  });

  it("announces add and remove in a polite live region", () => {
    const host = mount(<Pillbox label="Tags" defaultValue={["alpha"]} />);
    const region = status(host);
    expect(region).not.toBeNull();
    expect(region!.textContent).toBe("");

    typeInto(input(host), "beta");
    key(input(host), "Enter");
    expect(status(host)!.textContent).toBe("Added beta");

    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Remove alpha"]')!.click());
    expect(status(host)!.textContent).toBe("Removed alpha");

    key(input(host), "Backspace");
    expect(status(host)!.textContent).toBe("Removed beta");
  });

  it("takes every word from `labels`", () => {
    const host = mount(
      <Pillbox
        defaultValue={["alpha"]}
        labels={{ remove: "Quitar {tag}", added: "{tag} añadido", removed: "{tag} quitado" }}
      />,
    );
    expect(host.querySelector("button")!.getAttribute("aria-label")).toBe("Quitar alpha");

    typeInto(input(host), "beta");
    key(input(host), "Enter");
    expect(status(host)!.textContent).toBe("beta añadido");

    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Quitar alpha"]')!.click());
    expect(status(host)!.textContent).toBe("alpha quitado");
  });
});

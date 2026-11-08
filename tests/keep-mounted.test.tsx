// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Drawer } from "../src/components/Drawer";
import { Modal } from "../src/components/Modal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `keepMounted` (6.17.0) on Drawer and Modal.
 *
 * Both overlays unmount their children on close (useAnimation). The showcase's
 * radio drawer needed its `<audio>` element to survive close, so it had to use a
 * Card. With `keepMounted`, a closed overlay keeps its children mounted but
 * `hidden` + `inert` + `aria-hidden`: not painted, not focusable, not announced.
 * Focus trap, scroll lock and Escape stay keyed on `open`, not on mounted.
 */

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => act(() => root.unmount()),
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

type Overlay = (props: { open: boolean; onClose: () => void; keepMounted?: boolean; children: ReactNode }) => ReactElement;

const OVERLAYS: Array<[name: string, Comp: Overlay, panelSelector: string]> = [
  ["Drawer", Drawer as unknown as Overlay, "[data-react-fancy-drawer]"],
  ["Modal", Modal as unknown as Overlay, "[data-react-fancy-modal]"],
];

const content = () => (
  <>
    <button data-x="first">first</button>
    <audio data-x="audio" />
    <span data-x="live" aria-live="polite">
      Now playing
    </span>
    <button data-x="last">last</button>
  </>
);

const q = (x: string) => document.querySelector<HTMLElement>(`[data-x="${x}"]`);

/** Hidden from layout, focus and the accessibility tree by an ancestor (or itself). */
function isConcealed(el: HTMLElement) {
  return {
    hidden: el.closest("[hidden]") !== null,
    inert: el.closest("[inert]") !== null,
    ariaHidden: el.closest('[aria-hidden="true"]') !== null,
  };
}

for (const [name, Comp, panelSelector] of OVERLAYS) {
  describe(`${name} keepMounted`, () => {
    const render = (open: boolean, keepMounted?: boolean, onClose: () => void = () => {}) => (
      <Comp open={open} onClose={onClose} keepMounted={keepMounted}>
        {content()}
      </Comp>
    );

    it("keeps an element's identity across close and reopen", () => {
      const view = mount(render(true, true));
      const audio = q("audio");
      expect(audio).not.toBeNull();

      view.rerender(render(false, true));
      expect(q("audio"), "still mounted while closed").toBe(audio);
      expect(audio!.isConnected).toBe(true);

      view.rerender(render(true, true));
      expect(q("audio"), "the same element after reopening").toBe(audio);
    });

    it("mounts the children while closed from the start, concealed", () => {
      mount(render(false, true));
      expect(q("audio")).not.toBeNull();
      expect(isConcealed(q("audio")!)).toEqual({ hidden: true, inert: true, ariaHidden: true });
    });

    it("without it, unmounts on close as before", () => {
      const view = mount(render(true));
      const audio = q("audio");
      expect(audio).not.toBeNull();
      view.rerender(render(false));
      expect(q("audio")).toBeNull();
      expect(audio!.isConnected).toBe(false);
      expect(document.querySelector(panelSelector)).toBeNull();
    });

    it("closed content is not tabbable, not announced, and is inert + aria-hidden", () => {
      const view = mount(render(true, true));
      // Open: nothing concealed.
      expect(isConcealed(q("first")!)).toEqual({ hidden: false, inert: false, ariaHidden: false });

      view.rerender(render(false, true));
      for (const x of ["first", "last", "live", "audio"]) {
        expect(isConcealed(q(x)!), x).toEqual({ hidden: true, inert: true, ariaHidden: true });
      }
      // `hidden` is display: none, which removes both buttons from the tab
      // order and the live region from the accessibility tree.
      const frame = q("first")!.closest("[hidden]") as HTMLElement;
      expect(frame.hidden).toBe(true);
      expect(frame.hasAttribute("inert")).toBe(true);
    });

    it("traps focus only while open, and returns it on close", () => {
      const opener = document.createElement("button");
      opener.textContent = "open";
      document.body.append(opener);
      opener.focus();

      const view = mount(render(false, true));
      expect(document.activeElement, "a closed, mounted overlay does not take focus").toBe(opener);

      view.rerender(render(true, true));
      expect(document.activeElement, "opening moves focus in").toBe(q("first"));

      // Tab from the last stop wraps to the first while open.
      q("last")!.focus();
      const wrap = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
      act(() => {
        q("last")!.dispatchEvent(wrap);
      });
      expect(wrap.defaultPrevented, "Tab is trapped while open").toBe(true);
      expect(document.activeElement).toBe(q("first"));

      view.rerender(render(false, true));
      expect(document.activeElement, "closing returns focus to the opener").toBe(opener);

      // Closed: Tab is no longer intercepted inside the kept panel.
      const loose = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
      act(() => {
        q("last")!.dispatchEvent(loose);
      });
      expect(loose.defaultPrevented, "no trap while closed").toBe(false);
    });

    it("Escape and scroll lock apply only while open", () => {
      let closed = 0;
      const view = mount(render(false, true, () => closed++));
      expect(document.body.style.overflow).toBe("");
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      expect(closed, "Escape does nothing while closed").toBe(0);

      view.rerender(render(true, true, () => closed++));
      expect(document.body.style.overflow).toBe("hidden");
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
      expect(closed).toBe(1);

      view.rerender(render(false, true, () => closed++));
      expect(document.body.style.overflow).toBe("");
    });
  });
}

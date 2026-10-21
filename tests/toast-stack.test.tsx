// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { Toast } from "../src/components/Toast";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

function mount(el: ReactElement): { host: HTMLElement; root: Root } {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, root };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

interface Req {
  id: string;
  title: string;
}

const reqs = (n: number): Req[] =>
  Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}`, title: `Request ${i + 1}` }));

const stack = () => document.querySelector<HTMLElement>("[data-react-fancy-toast-stack]")!;
const front = () =>
  document.querySelector<HTMLElement>('[data-react-fancy-toast-stack-card="front"]')?.textContent;
const behind = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[data-react-fancy-toast-stack-card="behind"]'),
  );

function wheel(deltaY: number, deltaMode = 0) {
  const ev = new WheelEvent("wheel", { deltaY, deltaMode, bubbles: true, cancelable: true });
  act(() => {
    stack().dispatchEvent(ev);
  });
  return ev;
}

function key(k: string, target: Element = stack()) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
}

/** An uncontrolled stack of approval-like requests, rendered in place. */
function Basic(props: { n?: number; depth?: number; offset?: number; scaleStep?: number }) {
  return (
    <Toast.Stack
      items={reqs(props.n ?? 5)}
      position="inline"
      depth={props.depth}
      offset={props.offset}
      scaleStep={props.scaleStep}
      renderItem={(r: Req) => <span>{r.title}</span>}
    />
  );
}

/**
 * react-fancy#33 — the owner wants an agent's approval requests ("add a Postgres",
 * "start a process") to arrive as toasts he can Allow or Deny in place. His three
 * requirements, 2026-10-15: they stack behind each other with a slight top
 * offset; hovering the stack and scrolling walks through them; and a request
 * NEVER expires or disappears while it is pending.
 */
describe("Toast.Stack", () => {
  it("shows the front item with `depth` cards behind it", () => {
    mount(<Basic n={5} depth={2} />);

    expect(front()).toBe("Request 1");
    expect(behind().map((c) => c.textContent)).toEqual(["Request 2", "Request 3"]);
  });

  it("cards behind are out of reach: hidden from assistive tech and inert", () => {
    mount(<Basic n={3} depth={2} />);

    for (const card of behind()) {
      expect(card.getAttribute("aria-hidden")).toBe("true");
      expect(card.hasAttribute("inert")).toBe(true);
    }
  });

  it("offsets each card behind upward and scales it down", () => {
    mount(<Basic n={3} depth={2} offset={8} scaleStep={0.05} />);

    const [first, second] = behind();
    expect(first.style.transform).toBe("translateY(-8px) scale(0.95)");
    expect(second.style.transform).toBe("translateY(-16px) scale(0.9)");
  });

  it('counts what is beyond `depth` as "+N"', () => {
    mount(<Basic n={6} depth={2} />);

    expect(document.querySelector("[data-react-fancy-toast-stack-more]")?.textContent).toBe("+3");
  });

  /*
   * fancy-app-update#1 (MOIC): the badge sits OVER the cards peeking out behind
   * the front one. It was the soft zinc Badge, whose dark background is
   * `dark:bg-zinc-900/30` -- 30% opaque -- so over a card with a light image
   * header its zinc-300 text sat on a light screenshot and could not be read.
   * Whatever is behind it, the badge must paint its own opaque background, in
   * both themes. Asserted on the class string, as the kit's other dark-mode
   * tests do: jsdom has no stylesheet to resolve a colour from.
   */
  it('"+N" paints an OPAQUE background in both themes, whatever is behind it', () => {
    mount(<Basic n={6} depth={2} />);

    const cls = document.querySelector("[data-react-fancy-toast-stack-more]")!.className.split(/\s+/);
    const darkBg = cls.filter((c) => /^dark:bg-/.test(c));
    const lightBg = cls.filter((c) => /^bg-/.test(c));

    // Exactly one background per theme, so nothing translucent survives the merge.
    expect(darkBg).toHaveLength(1);
    expect(lightBg).toHaveLength(1);
    // No alpha modifier on either (the bug was `dark:bg-zinc-900/30`).
    for (const c of [...darkBg, ...lightBg]) expect(c).not.toMatch(/\//);
    expect(darkBg[0]).not.toBe("dark:bg-transparent");
    expect(lightBg[0]).not.toBe("bg-transparent");
  });

  it('shows no "+N" when everything is visible', () => {
    mount(<Basic n={3} depth={2} />);

    expect(document.querySelector("[data-react-fancy-toast-stack-more]")).toBeNull();
  });

  it("renders nothing for an empty list", () => {
    mount(<Basic n={0} />);

    expect(stack()).toBeNull();
  });

  describe("the wheel walks the stack", () => {
    it("one notch moves the front by one, in the direction scrolled", () => {
      mount(<Basic n={5} />);

      wheel(100);
      expect(front()).toBe("Request 2");
      wheel(-100);
      expect(front()).toBe("Request 1");
    });

    it("adds up small trackpad deltas instead of jumping on each one", () => {
      mount(<Basic n={5} />);

      for (let i = 0; i < 4; i++) wheel(10);
      expect(front()).toBe("Request 1");
      wheel(10);
      expect(front()).toBe("Request 2");
    });

    it("counts a line-mode event as one notch", () => {
      mount(<Basic n={5} />);

      wheel(3, 1);
      expect(front()).toBe("Request 2");
    });

    it("wraps at both ends", () => {
      mount(<Basic n={3} />);

      wheel(-100);
      expect(front()).toBe("Request 3");
      wheel(100);
      expect(front()).toBe("Request 1");
    });

    it("keeps the page from scrolling underneath while it does", () => {
      mount(<Basic n={3} />);

      expect(wheel(100).defaultPrevented).toBe(true);
    });

    it("leaves the page alone when there is nothing to cycle", () => {
      mount(<Basic n={1} />);

      expect(wheel(100).defaultPrevented).toBe(false);
    });
  });

  describe("arrow keys", () => {
    it("move the front when the stack has focus, and the stack is focusable", () => {
      mount(<Basic n={4} />);

      expect(stack().tabIndex).toBe(0);
      key("ArrowDown");
      expect(front()).toBe("Request 2");
      key("ArrowRight");
      expect(front()).toBe("Request 3");
      key("ArrowUp");
      key("ArrowLeft");
      expect(front()).toBe("Request 1");
    });

    it("show a visible focus ring", () => {
      mount(<Basic n={2} />);

      expect(stack().className).toMatch(/focus-visible:ring/);
    });

    it("leave a text field inside a card alone", () => {
      mount(
        <Toast.Stack
          items={reqs(3)}
          position="inline"
          renderItem={(r: Req) => (
            <label>
              {r.title}
              <input aria-label="note" />
            </label>
          )}
        />,
      );

      key("ArrowDown", document.querySelector('[data-react-fancy-toast-stack-card="front"] input')!);
      expect(front()).toBe("Request 1");
    });
  });

  it("NEVER drops an item: every one of many is reachable", () => {
    // The old provider's `maxToasts` silently dropped the oldest. A pending
    // approval must never disappear.
    mount(<Basic n={12} />);

    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      seen.add(front()!);
      wheel(100);
    }
    expect(seen.size).toBe(12);
    expect(front()).toBe("Request 1");
  });

  it("is controlled: frontIndex in, onFrontIndexChange out", () => {
    const changes: number[] = [];
    function Controlled() {
      const [index, setIndex] = useState(2);
      return (
        <Toast.Stack
          items={reqs(5)}
          position="inline"
          frontIndex={index}
          onFrontIndexChange={(i) => {
            changes.push(i);
            setIndex(i);
          }}
          renderItem={(r: Req) => <span>{r.title}</span>}
        />
      );
    }
    mount(<Controlled />);

    expect(front()).toBe("Request 3");
    wheel(100);
    expect(changes).toEqual([3]);
    expect(front()).toBe("Request 4");
  });

  it("when the front item is resolved and removed, the next one comes forward", () => {
    function Queue() {
      const [items, setItems] = useState(reqs(3));
      return (
        <Toast.Stack
          items={items}
          position="inline"
          renderItem={(r: Req) => (
            <button type="button" onClick={() => setItems((all) => all.filter((x) => x.id !== r.id))}>
              {r.title}
            </button>
          )}
        />
      );
    }
    mount(<Queue />);

    act(() => {
      document.querySelector<HTMLButtonElement>('[data-react-fancy-toast-stack-card="front"] button')!.click();
    });

    expect(front()).toBe("Request 2");
  });

  it("stays in range when the list shrinks under a far-forward index", () => {
    function Shrinking() {
      const [items, setItems] = useState(reqs(4));
      return (
        <>
          <button type="button" id="drop" onClick={() => setItems((all) => all.slice(0, 2))} />
          <Toast.Stack items={items} position="inline" renderItem={(r: Req) => <span>{r.title}</span>} />
        </>
      );
    }
    mount(<Shrinking />);

    wheel(100);
    wheel(100);
    wheel(100);
    expect(front()).toBe("Request 4");
    act(() => {
      document.querySelector<HTMLButtonElement>("#drop")!.click();
    });

    expect(["Request 1", "Request 2"]).toContain(front());
  });

  it("renders whatever actions the caller gives each item, all usable", () => {
    const clicked: string[] = [];
    mount(
      <Toast.Stack
        items={reqs(2)}
        position="inline"
        renderItem={(r: Req) => (
          <div>
            {r.title}
            {["Allow", "Deny", "Later"].map((a) => (
              <button key={a} type="button" onClick={() => clicked.push(`${a} ${r.id}`)}>
                {a}
              </button>
            ))}
          </div>
        )}
      />,
    );

    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '[data-react-fancy-toast-stack-card="front"] button',
    )) {
      act(() => button.click());
    }

    expect(clicked).toEqual(["Allow r1", "Deny r1", "Later r1"]);
  });

  it("has no timer: an item is still there after any amount of time", async () => {
    mount(<Basic n={2} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(front()).toBe("Request 1");
  });

  it("sits in a screen corner by default, outside the host's layout", () => {
    const { host } = mount(
      <Toast.Stack items={reqs(2)} renderItem={(r: Req) => <span>{r.title}</span>} />,
    );

    expect(host.querySelector("[data-react-fancy-toast-stack]")).toBeNull();
    expect(stack().closest("[data-react-fancy-toast-stack-position]")?.getAttribute(
      "data-react-fancy-toast-stack-position",
    )).toBe("bottom-right");
  });

  it('position="inline" renders where it is placed', () => {
    const { host } = mount(<Basic n={2} />);

    expect(host.querySelector("[data-react-fancy-toast-stack]")).not.toBeNull();
  });

  it("says where you are, for a screen reader", () => {
    mount(<Basic n={4} />);

    wheel(100);

    expect(
      document.querySelector("[data-react-fancy-toast-stack-status]")?.textContent,
    ).toBe("2 of 4");
  });
});

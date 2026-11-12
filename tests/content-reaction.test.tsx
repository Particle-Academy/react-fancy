// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import {
  ContentReaction,
  DEFAULT_CONTENT_REACTIONS,
  toggleReaction,
  type ContentReactionChangeMeta,
  type ContentReactionProps,
} from "../src/components/ContentReaction";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * ContentReaction: an emoji-reaction control for a comment, post or message.
 *
 * Controlled `value: string[]` of active reaction keys. A compact trigger shows
 * what is active (or a "React" placeholder) and opens a portalled picker whose
 * items are `menuitemcheckbox`es that toggle.
 *
 * The interaction rules are the reason this file is long: reaction pickers in
 * the wild close when the pointer crosses the gap between the trigger and the
 * picker, which makes them unusable. This one has no hover behaviour at all.
 * It closes on an outside click, Escape, or a select with closeOnSelect.
 */

const mounted: Array<() => void> = [];

function mount(el: ReactElement, container?: HTMLElement) {
  const host = document.createElement("div");
  (container ?? document.body).append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host, rerender: (next: ReactElement) => act(() => root.render(next)) };
}

afterEach(() => {
  while (mounted.length) mounted.pop()!();
  vi.restoreAllMocks();
  document.documentElement.classList.remove("dark");
});

const rootEl = () => document.querySelector<HTMLElement>("[data-react-fancy-content-reaction]")!;
const trigger = () => document.querySelector<HTMLButtonElement>("[data-react-fancy-content-reaction-trigger]")!;
const menu = () => document.querySelector<HTMLElement>("[data-react-fancy-content-reaction-menu]");
const items = () => [...document.querySelectorAll<HTMLElement>("[data-react-fancy-content-reaction-item]")];
const item = (key: string) => document.querySelector<HTMLElement>(`[data-reaction-key="${key}"][role="menuitemcheckbox"]`)!;

function key(k: string, on: Element = document.activeElement ?? document.body, init: KeyboardEventInit = {}) {
  let event!: KeyboardEvent;
  act(() => {
    event = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init });
    on.dispatchEvent(event);
  });
  return event;
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

/** Let rAF-driven positioning settle. */
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 40));
  });
}

type Change = { next: string[]; meta: ContentReactionChangeMeta };

function Controlled(props: Partial<ContentReactionProps> & { initial?: string[]; log?: Change[] }) {
  const { initial = [], log, ...rest } = props;
  const [value, setValue] = useState<string[]>(initial);
  return (
    <ContentReaction
      {...rest}
      value={value}
      onChange={(next, meta) => {
        log?.push({ next, meta });
        setValue(next);
      }}
    />
  );
}

/* ── the default set ─────────────────────────────────────────────────────── */

describe("default reactions", () => {
  it("are the eight named reactions, in order, with emoji and labels", () => {
    expect(DEFAULT_CONTENT_REACTIONS.map((r) => r.key)).toEqual([
      "strongly-agree",
      "like",
      "love",
      "insightful",
      "funny",
      "sad",
      "angry",
      "dislike",
    ]);
    for (const r of DEFAULT_CONTENT_REACTIONS) {
      // Resolved from the emoji dataset by name: a renamed dataset entry would
      // leave an empty emoji and this is the only place that would notice.
      expect(r.emoji, r.key).toBeTruthy();
      expect(r.label, r.key).toMatch(/^[A-Z][a-z ]+$/);
    }
    expect(new Set(DEFAULT_CONTENT_REACTIONS.map((r) => r.emoji)).size).toBe(8);
  });

  it("renders the defaults when no reactions are passed", () => {
    mount(<Controlled />);
    click(trigger());
    expect(items().map((el) => el.getAttribute("data-reaction-key"))).toEqual(
      DEFAULT_CONTENT_REACTIONS.map((r) => r.key),
    );
  });

  it("an app can pass its own set", () => {
    const reactions = [
      { key: "yes", emoji: "Y", label: "Yes" },
      { key: "no", emoji: "N", label: "No" },
    ];
    mount(<Controlled reactions={reactions} />);
    click(trigger());
    expect(items().map((el) => el.getAttribute("data-reaction-key"))).toEqual(["yes", "no"]);
    expect(item("yes").getAttribute("aria-label")).toBe("Yes");
  });
});

/* ── toggleReaction (pure) ───────────────────────────────────────────────── */

describe("toggleReaction", () => {
  it("multi: adds and removes, keeping the others", () => {
    expect(toggleReaction(["like"], "love", "multi")).toEqual({ next: ["like", "love"], on: true });
    expect(toggleReaction(["like", "love"], "like", "multi")).toEqual({ next: ["love"], on: false });
  });

  it("single: replaces the others, and choosing the active one clears it", () => {
    expect(toggleReaction(["like"], "love", "single")).toEqual({ next: ["love"], on: true });
    expect(toggleReaction(["love"], "love", "single")).toEqual({ next: [], on: false });
  });
});

/* ── trigger ─────────────────────────────────────────────────────────────── */

describe("trigger", () => {
  it('shows a "React" placeholder when nothing is active', () => {
    mount(<Controlled />);
    expect(trigger().textContent).toContain("React");
    expect(trigger().getAttribute("aria-label")).toBe("React");
  });

  it("triggerLabel replaces the placeholder", () => {
    mount(<Controlled triggerLabel="Add reaction" />);
    expect(trigger().textContent).toContain("Add reaction");
  });

  it("shows the active reactions and names them", () => {
    mount(<Controlled initial={["love", "like"]} />);
    const chips = [...trigger().querySelectorAll("[data-react-fancy-content-reaction-chip]")].map((c) =>
      c.getAttribute("data-reaction-key"),
    );
    // In the reaction set's order, not the value's.
    expect(chips).toEqual(["like", "love"]);
    expect(trigger().textContent).not.toContain("React");
    expect(trigger().getAttribute("aria-label")).toBe("React: Like, Love");
  });

  it("with counts, shows aggregate counts and marks mine", () => {
    mount(<Controlled initial={["love"]} counts={{ like: 3, love: 1, sad: 0 }} mine={["love"]} />);
    const chips = [...trigger().querySelectorAll<HTMLElement>("[data-react-fancy-content-reaction-chip]")];
    expect(chips.map((c) => c.getAttribute("data-reaction-key"))).toEqual(["like", "love"]);
    expect(chips[0]!.textContent).toContain("3");
    expect(chips[0]!.getAttribute("data-mine")).toBe("false");
    expect(chips[1]!.getAttribute("data-mine")).toBe("true");
    expect(trigger().getAttribute("aria-label")).toBe("React: Like 3, Love 1");
  });

  it("mine defaults to value", () => {
    mount(<Controlled initial={["like"]} counts={{ like: 2 }} />);
    const chip = trigger().querySelector<HTMLElement>('[data-reaction-key="like"]')!;
    expect(chip.getAttribute("data-mine")).toBe("true");
  });

  it("renderTrigger replaces the trigger's content, and the trigger keeps its ARIA", () => {
    mount(
      <Controlled
        initial={["like"]}
        renderTrigger={({ active, open }) => (
          <span data-custom>{`${active.map((r) => r.key).join("+")}:${open ? "open" : "closed"}`}</span>
        )}
      />,
    );
    expect(trigger().querySelector("[data-custom]")!.textContent).toBe("like:closed");
    click(trigger());
    expect(trigger().querySelector("[data-custom]")!.textContent).toBe("like:open");
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
  });

  it("is SSR-safe and renders no picker on the server", () => {
    const html = renderToString(<ContentReaction value={["like"]} onChange={() => {}} />);
    expect(html).toContain("data-react-fancy-content-reaction");
    expect(html).not.toContain('role="menu"');
  });
});

/* ── stable handles ──────────────────────────────────────────────────────── */

describe("stable handles", () => {
  it("root, items, data-state and id", () => {
    mount(<Controlled id="post-7" initial={["like"]} data-handle="r" />);
    expect(rootEl().id).toBe("post-7");
    expect(rootEl().getAttribute("data-handle")).toBe("r");
    expect(rootEl().getAttribute("data-value")).toBe("like");
    click(trigger());
    expect(item("like").getAttribute("data-state")).toBe("on");
    expect(item("love").getAttribute("data-state")).toBe("off");
    expect(trigger().getAttribute("aria-controls")).toBe(menu()!.id);
  });
});

/* ── toggling ────────────────────────────────────────────────────────────── */

describe("toggling", () => {
  it("multi: each item toggles on and off, with meta", () => {
    const log: Change[] = [];
    mount(<Controlled log={log} />);
    click(trigger());
    click(item("like"));
    click(item("love"));
    click(item("like"));
    expect(log).toEqual([
      { next: ["like"], meta: { key: "like", on: true } },
      { next: ["like", "love"], meta: { key: "love", on: true } },
      { next: ["love"], meta: { key: "like", on: false } },
    ]);
  });

  it("multi: the picker stays open after a select by default", () => {
    mount(<Controlled />);
    click(trigger());
    click(item("like"));
    expect(menu()).not.toBeNull();
  });

  it("single: choosing one replaces the others; choosing the active one clears it", () => {
    const log: Change[] = [];
    mount(<Controlled mode="single" initial={["like"]} log={log} closeOnSelect={false} />);
    click(trigger());
    click(item("love"));
    click(item("love"));
    expect(log).toEqual([
      { next: ["love"], meta: { key: "love", on: true } },
      { next: [], meta: { key: "love", on: false } },
    ]);
  });

  it("single: closes on select by default and returns focus to the trigger", () => {
    mount(<Controlled mode="single" />);
    key("ArrowDown", trigger());
    expect(menu()).not.toBeNull();
    key("Enter", item("strongly-agree"));
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("closeOnSelect overrides the mode default", () => {
    mount(<Controlled closeOnSelect />);
    click(trigger());
    click(item("like"));
    expect(menu()).toBeNull();
  });

  it("aria-checked follows value", () => {
    const { rerender } = mount(<ContentReaction value={["sad"]} onChange={() => {}} />);
    click(trigger());
    expect(item("sad").getAttribute("aria-checked")).toBe("true");
    expect(item("funny").getAttribute("aria-checked")).toBe("false");
    rerender(<ContentReaction value={["funny"]} onChange={() => {}} />);
    expect(item("sad").getAttribute("aria-checked")).toBe("false");
    expect(item("funny").getAttribute("aria-checked")).toBe("true");
  });

  it("is controlled: without an onChange update nothing changes", () => {
    const onChange = vi.fn();
    mount(<ContentReaction value={[]} onChange={onChange} />);
    click(trigger());
    click(item("like"));
    expect(onChange).toHaveBeenCalledWith(["like"], { key: "like", on: true });
    expect(item("like").getAttribute("aria-checked")).toBe("false");
  });

  it("disabled: the trigger does not open", () => {
    mount(<Controlled disabled />);
    expect(trigger().disabled).toBe(true);
    click(trigger());
    key("ArrowDown", trigger());
    expect(menu()).toBeNull();
    expect(rootEl().getAttribute("data-disabled")).toBe("true");
  });
});

/* ── open / close ────────────────────────────────────────────────────────── */

describe("open and close", () => {
  it("renders the picker in a portal, outside an overflow container", () => {
    const clip = document.createElement("div");
    clip.style.overflow = "hidden";
    clip.style.height = "10px";
    document.body.append(clip);
    mount(<Controlled />, clip);
    click(trigger());
    expect(menu()).not.toBeNull();
    expect(clip.contains(menu())).toBe(false);
    expect(document.body.contains(menu())).toBe(true);
    clip.remove();
  });

  it("NEVER closes on mouse-leave from the trigger or the picker", async () => {
    mount(<Controlled />);
    click(trigger());
    const leave = (el: Element) =>
      act(() => {
        for (const type of ["mouseout", "mouseleave", "pointerout", "pointerleave"]) {
          el.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: document.body }));
        }
      });
    leave(trigger());
    await settle();
    expect(menu()).not.toBeNull();
    leave(menu()!);
    for (const el of items()) leave(el);
    await settle();
    expect(menu()).not.toBeNull();
  });

  it("has no hover dead zone: crossing the gap and hovering items keeps it open", async () => {
    mount(<Controlled />);
    click(trigger());
    act(() => {
      // trigger -> the gap (body) -> the picker
      trigger().dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
      document.body.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      menu()!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      items()[2]!.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    await settle();
    expect(menu()).not.toBeNull();
    // and hovering does not open it either: it is click / keyboard only
    act(() => {
      trigger().click();
    });
    expect(menu()).toBeNull();
    act(() => {
      trigger().dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      trigger().dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    });
    await settle();
    expect(menu()).toBeNull();
  });

  it("closes on an outside click, without moving focus", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    mount(<Controlled />);
    click(trigger());
    expect(menu()).not.toBeNull();
    // A click inside the picker does not count as outside.
    act(() => {
      menu()!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(menu()).not.toBeNull();
    outside.focus();
    click(outside);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("Escape closes and returns focus to the trigger", () => {
    mount(<Controlled />);
    key("ArrowDown", trigger());
    expect(document.activeElement).toBe(item("strongly-agree"));
    key("Escape");
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("clicking the trigger toggles", () => {
    mount(<Controlled />);
    click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    click(trigger());
    expect(menu()).toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});

/* ── keyboard ────────────────────────────────────────────────────────────── */

describe("keyboard", () => {
  for (const k of ["Enter", " ", "ArrowDown"]) {
    it(`${JSON.stringify(k)} on the trigger opens the picker on the first item`, () => {
      mount(<Controlled />);
      const ev = key(k, trigger());
      expect(ev.defaultPrevented).toBe(true);
      expect(menu()).not.toBeNull();
      expect(document.activeElement).toBe(item("strongly-agree"));
    });
  }

  it("arrow keys move between items with roving focus, wrapping", () => {
    mount(<Controlled />);
    key("ArrowDown", trigger());
    key("ArrowRight");
    expect(document.activeElement).toBe(item("like"));
    key("ArrowDown");
    expect(document.activeElement).toBe(item("love"));
    key("ArrowLeft");
    expect(document.activeElement).toBe(item("like"));
    key("ArrowUp");
    expect(document.activeElement).toBe(item("strongly-agree"));
    key("ArrowUp");
    expect(document.activeElement).toBe(item("dislike"));
    // roving: exactly one item is in the tab order, the focused one
    expect(items().filter((el) => el.tabIndex === 0)).toEqual([item("dislike")]);
  });

  it("Home and End jump to the ends", () => {
    mount(<Controlled />);
    key("ArrowDown", trigger());
    key("End");
    expect(document.activeElement).toBe(item("dislike"));
    key("Home");
    expect(document.activeElement).toBe(item("strongly-agree"));
  });

  it("Enter and Space toggle the focused item", () => {
    const log: Change[] = [];
    mount(<Controlled log={log} />);
    key("ArrowDown", trigger());
    key("ArrowRight");
    const enter = key("Enter");
    expect(enter.defaultPrevented).toBe(true);
    const space = key(" ");
    expect(space.defaultPrevented).toBe(true);
    expect(log.map((c) => c.meta)).toEqual([
      { key: "like", on: true },
      { key: "like", on: false },
    ]);
    // multi: still open, focus still on the item
    expect(document.activeElement).toBe(item("like"));
  });

  it("in RTL, ArrowLeft moves to the next item", () => {
    const wrap = document.createElement("div");
    wrap.setAttribute("dir", "rtl");
    wrap.style.direction = "rtl";
    document.body.append(wrap);
    mount(<Controlled />, wrap);
    key("ArrowDown", trigger());
    key("ArrowLeft");
    expect(document.activeElement).toBe(item("like"));
    wrap.remove();
  });
});

/* ── ARIA ────────────────────────────────────────────────────────────────── */

describe("ARIA", () => {
  it("trigger: aria-haspopup=menu and aria-expanded", () => {
    mount(<Controlled />);
    expect(trigger().tagName).toBe("BUTTON");
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("picker is role=menu, named; items are menuitemcheckbox with aria-checked", () => {
    mount(<Controlled initial={["love"]} />);
    click(trigger());
    expect(menu()!.getAttribute("role")).toBe("menu");
    expect(menu()!.getAttribute("aria-label")).toBe("Reactions");
    for (const el of items()) {
      expect(el.getAttribute("role")).toBe("menuitemcheckbox");
      expect(["true", "false"]).toContain(el.getAttribute("aria-checked"));
    }
    expect(item("love").getAttribute("aria-checked")).toBe("true");
    expect(item("love").getAttribute("aria-label")).toBe("Love");
  });

  it("with counts, each item's label includes its count", () => {
    mount(<Controlled counts={{ like: 4, love: 0 }} />);
    click(trigger());
    expect(item("like").getAttribute("aria-label")).toBe("Like (4)");
    expect(item("love").getAttribute("aria-label")).toBe("Love (0)");
    // a reaction missing from counts reads as 0, not as an unlabelled number
    expect(item("sad").getAttribute("aria-label")).toBe("Sad (0)");
  });

  it("labels are translatable", () => {
    mount(
      <Controlled
        initial={["like"]}
        counts={{ like: 2 }}
        labels={{ trigger: "Reagieren", menu: "Reaktionen", itemCount: "{label}: {count}", triggerActive: "{trigger} - {reactions}" }}
      />,
    );
    expect(trigger().getAttribute("aria-label")).toBe("Reagieren - Like 2");
    click(trigger());
    expect(menu()!.getAttribute("aria-label")).toBe("Reaktionen");
    expect(item("like").getAttribute("aria-label")).toBe("Like: 2");
  });

  it("the emoji glyphs are hidden from assistive technology", () => {
    mount(<Controlled initial={["like"]} />);
    click(trigger());
    for (const glyph of document.querySelectorAll("[data-react-fancy-content-reaction-emoji]")) {
      expect(glyph.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

/* ── theming ─────────────────────────────────────────────────────────────── */

describe("theme tokens", () => {
  it("the active highlight reads --fancy-* tokens in light and dark, not literal colours", () => {
    mount(<Controlled initial={["like"]} />);
    click(trigger());
    const on = item("like").className;
    const off = item("love").className;
    expect(on).toContain("bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))]");
    expect(on).toContain("dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]");
    expect(on).toContain("ring-[color:var(--fancy-accent,var(--color-blue-600))]");
    expect(on).toContain("dark:ring-[color:var(--fancy-accent-dark,var(--color-blue-500))]");
    expect(off).not.toContain("--fancy-accent");
    for (const cls of [on, off, menu()!.className, trigger().className]) {
      expect(cls.replace(/var\(--[a-z-]+,[^)\]]+\)+/g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
    }
  });

  it("the picker surface follows dark mode through the portal", () => {
    document.documentElement.classList.add("dark");
    mount(<Controlled />);
    click(trigger());
    expect(menu()!.className).toContain("dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]");
    // Portal copies `dark` from <html> onto its wrapper so dark: utilities apply.
    expect(menu()!.closest(".dark")).not.toBeNull();
  });
});

/* ── placement ───────────────────────────────────────────────────────────── */

describe("placement", () => {
  function rects(anchor: Partial<DOMRect>) {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const r = (x: number, y: number, w: number, h: number) =>
        ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON() {} }) as DOMRect;
      if (this.hasAttribute("data-react-fancy-content-reaction-trigger")) {
        const { left = 100, top = 100, width = 40, height = 24 } = anchor;
        return r(left, top, width, height);
      }
      if (this.hasAttribute("data-react-fancy-content-reaction-menu")) return r(0, 0, 200, 40);
      return r(0, 0, 0, 0);
    });
  }

  it("defaults to top-start", async () => {
    rects({ left: 100, top: 300 });
    mount(<Controlled />);
    click(trigger());
    await settle();
    expect(menu()!.getAttribute("data-placement")).toBe("top-start");
  });

  it("flips top to bottom when there is no room above", async () => {
    rects({ left: 100, top: 5 });
    mount(<Controlled placement="top" />);
    click(trigger());
    await settle();
    expect(menu()!.getAttribute("data-placement")).toBe("bottom");
  });

  it("flips bottom to top when there is no room below", async () => {
    rects({ left: 100, top: window.innerHeight - 30 });
    mount(<Controlled placement="bottom-end" />);
    click(trigger());
    await settle();
    expect(menu()!.getAttribute("data-placement")).toBe("top-end");
  });

  it("flips left to right when there is no room on the left", async () => {
    rects({ left: 5, top: 300 });
    mount(<Controlled placement="left" />);
    click(trigger());
    await settle();
    expect(menu()!.getAttribute("data-placement")).toBe("right");
  });

  it("flips right to left when there is no room on the right", async () => {
    rects({ left: window.innerWidth - 50, top: 300 });
    mount(<Controlled placement="right" />);
    click(trigger());
    await settle();
    expect(menu()!.getAttribute("data-placement")).toBe("left");
  });

  it("stays inside the viewport", async () => {
    rects({ left: window.innerWidth - 20, top: 300 });
    mount(<Controlled placement="top-start" />);
    click(trigger());
    await settle();
    const left = parseFloat(menu()!.style.left);
    expect(left + 200).toBeLessThanOrEqual(window.innerWidth - 4);
  });
});

/* ── sizes ───────────────────────────────────────────────────────────────── */

describe("size", () => {
  it("is reflected on the root and changes the trigger", () => {
    const { rerender } = mount(<ContentReaction value={[]} onChange={() => {}} size="sm" />);
    const sm = trigger().className;
    expect(rootEl().getAttribute("data-size")).toBe("sm");
    rerender(<ContentReaction value={[]} onChange={() => {}} size="lg" />);
    expect(rootEl().getAttribute("data-size")).toBe("lg");
    expect(trigger().className).not.toBe(sm);
  });
});

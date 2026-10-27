// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, createRef, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  ChatMessage,
  ChatThread,
  type ChatMessageData,
  type ChatThreadActivity,
  type ChatThreadHandle,
} from "../src/components/ChatThread";
import * as packageRoot from "../src/index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * ChatThread / ChatMessage — the shared message-list primitive that
 * charlotte-ui's side panel and fancy-support's admin chat + ticket thread are
 * both built on (Fancy Exclusive: neither builds a local substitute).
 *
 * jsdom has no layout, so the scroll tests give the log element a fake
 * geometry: every rendered message is 100px tall and the viewport is 200px.
 * `scrollTop` is stored and clamped the way a browser clamps it. What is
 * asserted is where the component PUT the scroll position, which is the whole
 * contract of "stick to the bottom, but never yank someone reading history".
 */

// ---------------------------------------------------------------------------
// Fake scroll geometry for the log element only
// ---------------------------------------------------------------------------

const ROW = 100;
const VIEW = 200;
const tops = new WeakMap<Element, number>();
const saved: Record<string, PropertyDescriptor | undefined> = {};
/** Mimic browser scroll anchoring (on by default in Chrome and Firefox). */
let anchoring = false;
const anchors = new WeakMap<Element, { id: string; rem: number }>();

function isLog(el: Element): boolean {
  return el.hasAttribute("data-react-fancy-chat-thread-log");
}

function fakeScrollHeight(el: Element): number {
  return el.querySelectorAll("[data-chat-message]").length * ROW;
}

beforeAll(() => {
  for (const key of ["scrollHeight", "clientHeight", "scrollTop"]) {
    saved[key] = Object.getOwnPropertyDescriptor(Element.prototype, key);
  }
  Object.defineProperty(Element.prototype, "scrollHeight", {
    configurable: true,
    get(this: Element) {
      return isLog(this) ? fakeScrollHeight(this) : 0;
    },
  });
  Object.defineProperty(Element.prototype, "clientHeight", {
    configurable: true,
    get(this: Element) {
      return isLog(this) ? VIEW : 0;
    },
  });
  Object.defineProperty(Element.prototype, "scrollTop", {
    configurable: true,
    get(this: Element) {
      if (anchoring && isLog(this)) {
        // Chrome's overflow-anchor: the position is held relative to a
        // message, so rows inserted above move scrollTop by themselves.
        const a = anchors.get(this);
        if (a) {
          const rows = [...this.querySelectorAll("[data-chat-message]")];
          const i = rows.findIndex((r) => r.getAttribute("data-chat-message") === a.id);
          if (i >= 0) return i * ROW + a.rem;
        }
      }
      return tops.get(this) ?? 0;
    },
    set(this: Element, v: number) {
      const max = isLog(this) ? Math.max(0, fakeScrollHeight(this) - VIEW) : 0;
      const top = Math.min(Math.max(0, v), max);
      tops.set(this, top);
      if (isLog(this)) {
        const row = this.querySelectorAll("[data-chat-message]")[Math.floor(top / ROW)];
        const id = row?.getAttribute("data-chat-message");
        if (id) anchors.set(this, { id, rem: top % ROW });
        else anchors.delete(this);
      }
    },
  });
});

afterAll(() => {
  for (const [key, desc] of Object.entries(saved)) {
    if (desc) Object.defineProperty(Element.prototype, key, desc);
    else delete (Element.prototype as unknown as Record<string, unknown>)[key];
  }
});

// ---------------------------------------------------------------------------
// Mounting
// ---------------------------------------------------------------------------

const roots: Root[] = [];

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(el));
  return {
    host,
    rerender: (next: ReactElement) => act(() => root.render(next)),
  };
}

afterEach(() => {
  roots.splice(0).forEach((r) => act(() => r.unmount()));
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function msg(id: string, extra: Partial<ChatMessageData> = {}): ChatMessageData {
  return {
    id,
    role: "assistant",
    content: `message ${id}`,
    createdAt: "2026-10-27T10:00:00",
    ...extra,
  };
}

function many(n: number, from = 1): ChatMessageData[] {
  return Array.from({ length: n }, (_, i) => msg(String(from + i)));
}

function logOf(host: HTMLElement): HTMLElement {
  return host.querySelector<HTMLElement>("[data-react-fancy-chat-thread-log]")!;
}

function messageEl(host: HTMLElement, id: string): HTMLElement | null {
  return host.querySelector<HTMLElement>(`[data-chat-message="${id}"]`);
}

function scrollLogTo(log: HTMLElement, top: number) {
  act(() => {
    log.scrollTop = top;
    log.dispatchEvent(new Event("scroll"));
  });
}

function click(el: Element | null) {
  if (!el) throw new Error("nothing to click");
  act(() => {
    (el as HTMLElement).click();
  });
}

// ---------------------------------------------------------------------------
// Handles + accessibility
// ---------------------------------------------------------------------------

describe("stable handles and accessibility", () => {
  it("renders the root handle and a polite role=log", () => {
    const { host } = mount(<ChatThread messages={many(2)} />);
    expect(host.querySelector("[data-react-fancy-chat-thread]")).not.toBeNull();
    const log = logOf(host);
    expect(log.getAttribute("role")).toBe("log");
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(log.getAttribute("aria-label")).toBe("Conversation");
  });

  it("labels the log by its heading when one is given", () => {
    const { host } = mount(<ChatThread messages={[]} heading="Ticket SUP-12" />);
    const log = logOf(host);
    const id = log.getAttribute("aria-labelledby");
    expect(id).toBeTruthy();
    const heading = document.getElementById(id!);
    expect(heading?.tagName).toBe("H2");
    expect(heading?.textContent).toBe("Ticket SUP-12");
    expect(log.hasAttribute("aria-label")).toBe(false);
  });

  it("puts id, role, status and visibility on every message", () => {
    const { host } = mount(
      <ChatThread
        messages={[
          msg("a", { role: "user", status: "sent" }),
          msg("b", { role: "staff", status: "pending", visibility: "internal" }),
          msg("c", { role: "triage-bot", status: "failed" }),
        ]}
      />,
    );
    const a = messageEl(host, "a")!;
    expect(a.getAttribute("data-chat-role")).toBe("user");
    expect(a.getAttribute("data-chat-status")).toBe("sent");
    expect(a.getAttribute("data-chat-visibility")).toBe("public");
    const b = messageEl(host, "b")!;
    expect(b.getAttribute("data-chat-status")).toBe("pending");
    expect(b.getAttribute("data-chat-visibility")).toBe("internal");
    // An arbitrary host role is carried verbatim, not coerced.
    expect(messageEl(host, "c")!.getAttribute("data-chat-role")).toBe("triage-bot");
  });

  it("passes data-* props through to the root", () => {
    const { host } = mount(<ChatThread messages={[]} data-handle="t" />);
    expect(host.querySelector("[data-react-fancy-chat-thread][data-handle='t']")).not.toBeNull();
  });

  it("marks a streaming message aria-busy so each token is not announced", () => {
    const { host } = mount(<ChatThread messages={[msg("s", { status: "streaming" })]} />);
    expect(messageEl(host, "s")!.getAttribute("aria-busy")).toBe("true");
  });

  it("renders the author's name, and a role label when there is no author", () => {
    const { host } = mount(
      <ChatThread
        messages={[
          msg("a", { role: "staff", author: { name: "Dana Park" } }),
          msg("b", { role: "assistant", createdAt: "2026-10-27T11:00:00" }),
        ]}
      />,
    );
    expect(messageEl(host, "a")!.querySelector("[data-chat-author]")!.textContent).toBe("Dana Park");
    expect(messageEl(host, "b")!.querySelector("[data-chat-author]")!.textContent).toBe("Assistant");
  });
});

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

describe("content goes through ContentRenderer, sanitised", () => {
  it("renders markdown", () => {
    const { host } = mount(<ChatThread messages={[msg("m", { content: "Hello **there**" })]} />);
    expect(messageEl(host, "m")!.querySelector("strong")!.textContent).toBe("there");
  });

  it("strips script and event handlers from message content", () => {
    const { host } = mount(
      <ChatThread
        messages={[
          msg("x", {
            content: 'Hi <img src="x" onerror="alert(1)"> <script>alert(2)</script> [a](javascript:alert(3))',
          }),
        ]}
      />,
    );
    const el = messageEl(host, "x")!;
    expect(el.querySelector("script")).toBeNull();
    expect(el.innerHTML).not.toContain("onerror");
    expect(el.innerHTML).not.toContain("javascript:");
  });

  it("renders format=text literally, never as markdown or HTML", () => {
    const { host } = mount(
      <ChatThread messages={[msg("t", { format: "text", content: "**not bold** <b>nor this</b>" })]} />,
    );
    const el = messageEl(host, "t")!;
    expect(el.querySelector("strong")).toBeNull();
    expect(el.querySelector("b")).toBeNull();
    expect(el.textContent).toContain("**not bold** <b>nor this</b>");
  });

  it("holds back an unfinished code fence while streaming, by default", () => {
    const content = "Text\n\n```js\nconst a = 1;\nconst b";
    const { host } = mount(<ChatThread messages={[msg("s", { status: "streaming", content })]} />);
    expect(messageEl(host, "s")!.querySelector("pre")).toBeNull();
  });

  it('shows the open fence as it fills with streaming="progressive"', () => {
    const content = "Text\n\n```js\nconst a = 1;\nconst b";
    const { host } = mount(
      <ChatThread streaming="progressive" messages={[msg("s", { status: "streaming", content })]} />,
    );
    expect(messageEl(host, "s")!.querySelector("pre")!.textContent).toBe("const a = 1;\nconst b\n");
  });

  it("does not hold anything back once the message is sent", () => {
    const content = "Text\n\n```js\nconst a = 1;\nconst b";
    const { host } = mount(<ChatThread messages={[msg("s", { status: "sent", content })]} />);
    expect(messageEl(host, "s")!.querySelector("pre")).not.toBeNull();
  });

  it("renders attachments as links, and never a dangerous href", () => {
    const { host } = mount(
      <ChatThread
        messages={[
          msg("a", {
            attachments: [
              { id: "f1", name: "log.txt", url: "https://example.com/log.txt" },
              { id: "f2", name: "evil.html", url: "javascript:alert(1)" },
            ],
          }),
        ]}
      />,
    );
    const items = messageEl(host, "a")!.querySelectorAll("[data-chat-attachment]");
    expect(items).toHaveLength(2);
    expect(items[0].querySelector("a")!.getAttribute("href")).toBe("https://example.com/log.txt");
    expect(items[0].querySelector("a")!.getAttribute("rel")).toContain("noopener");
    expect(items[1].querySelector("a")).toBeNull();
    expect(items[1].textContent).toContain("evil.html");
    // Attachments are links, never auto-loaded images.
    expect(messageEl(host, "a")!.querySelector("img")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Internal notes
// ---------------------------------------------------------------------------

describe("internal notes", () => {
  it("labels an internal note visibly, and leaves a public message unlabelled", () => {
    const { host } = mount(
      <ChatThread
        messages={[
          msg("pub", { role: "staff" }),
          msg("int", { role: "staff", visibility: "internal", createdAt: "2026-10-27T10:30:00" }),
        ]}
      />,
    );
    expect(messageEl(host, "pub")!.querySelector("[data-chat-internal-label]")).toBeNull();
    const label = messageEl(host, "int")!.querySelector("[data-chat-internal-label]");
    expect(label?.textContent).toBe("Internal note");
  });

  it("renders exactly what it is given: it never filters by visibility", () => {
    // The host passes only what the viewer may see. A component that hid
    // internal notes itself would be a second, untested policy.
    const { host } = mount(
      <ChatThread messages={[msg("1", { visibility: "internal" }), msg("2", { visibility: "public" })]} />,
    );
    expect(host.querySelectorAll("[data-chat-message]")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

describe("slots", () => {
  it("renders the per-message actions slot inside each message", () => {
    const renderActions = vi.fn((m: ChatMessageData) => <button data-copy={m.id}>Copy</button>);
    const { host } = mount(<ChatThread messages={many(2)} renderActions={renderActions} />);
    expect(renderActions).toHaveBeenCalledTimes(2);
    const slot = messageEl(host, "2")!.querySelector("[data-chat-message-actions]");
    expect(slot!.querySelector("[data-copy='2']")).not.toBeNull();
  });

  it("omits the actions wrapper when the slot renders nothing", () => {
    const { host } = mount(<ChatThread messages={many(1)} renderActions={() => null} />);
    expect(host.querySelector("[data-chat-message-actions]")).toBeNull();
  });

  it("renders the composer slot after the log, outside it", () => {
    const { host } = mount(<ChatThread messages={many(1)} composer={<textarea data-my-composer="" />} />);
    const slot = host.querySelector("[data-react-fancy-chat-thread-composer]")!;
    expect(slot.querySelector("[data-my-composer]")).not.toBeNull();
    expect(logOf(host).contains(slot)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

describe("proposals", () => {
  const proposal = (state?: "pending" | "accepted" | "rejected" | "withdrawn") =>
    msg("p1", {
      role: "agent",
      content: "Set priority to **high**",
      proposal: { id: "card-7", title: "Change priority", ...(state ? { state } : {}) },
    });

  it("renders a stable data-chat-proposal handle and never acts on its own", () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const { host } = mount(
      <ChatThread messages={[proposal()]} onProposalAccept={onAccept} onProposalReject={onReject} />,
    );
    const card = host.querySelector("[data-chat-proposal='card-7']")!;
    expect(card.getAttribute("data-chat-proposal-state")).toBe("pending");
    expect(card.textContent).toContain("Change priority");
    expect(onAccept).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it("calls accept / reject with the message and emits activity", () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const onActivity = vi.fn<(e: ChatThreadActivity) => void>();
    const { host } = mount(
      <ChatThread
        messages={[proposal()]}
        onProposalAccept={onAccept}
        onProposalReject={onReject}
        onActivity={onActivity}
      />,
    );
    click(host.querySelector("[data-chat-proposal-action='accept']"));
    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }));
    expect(onActivity).toHaveBeenCalledWith({ type: "proposal-accept", messageId: "p1", proposalId: "card-7" });
    click(host.querySelector("[data-chat-proposal-action='reject']"));
    expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }));
    expect(onActivity).toHaveBeenCalledWith({ type: "proposal-reject", messageId: "p1", proposalId: "card-7" });
  });

  it("shows no decision buttons once the host says it is decided", () => {
    const { host } = mount(
      <ChatThread messages={[proposal("accepted")]} onProposalAccept={() => {}} onProposalReject={() => {}} />,
    );
    const card = host.querySelector("[data-chat-proposal='card-7']")!;
    expect(card.getAttribute("data-chat-proposal-state")).toBe("accepted");
    expect(card.querySelector("[data-chat-proposal-action]")).toBeNull();
    expect(card.textContent).toContain("Accepted");
  });

  it("shows only the decisions the host wired", () => {
    const { host } = mount(<ChatThread messages={[proposal()]} onProposalAccept={() => {}} />);
    expect(host.querySelector("[data-chat-proposal-action='accept']")).not.toBeNull();
    expect(host.querySelector("[data-chat-proposal-action='reject']")).toBeNull();
  });

  it("disables both decisions while an async decision is in flight, and refuses a second", async () => {
    let resolve!: () => void;
    const onAccept = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const onReject = vi.fn();
    const { host } = mount(
      <ChatThread messages={[proposal()]} onProposalAccept={onAccept} onProposalReject={onReject} />,
    );
    const accept = host.querySelector<HTMLButtonElement>("[data-chat-proposal-action='accept']")!;
    const reject = host.querySelector<HTMLButtonElement>("[data-chat-proposal-action='reject']")!;
    // Same batch: no re-render has disabled anything yet, so only the guard
    // stands between a double click (or accept-then-reject) and two decisions.
    act(() => {
      accept.click();
      accept.click();
      reject.click();
    });
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onReject).not.toHaveBeenCalled();
    expect(accept.disabled).toBe(true);
    expect(reject.disabled).toBe(true);
    expect(host.querySelector("[data-chat-proposal='card-7']")!.getAttribute("aria-busy")).toBe("true");

    await act(async () => {
      resolve();
    });
    expect(host.querySelector<HTMLButtonElement>("[data-chat-proposal-action='accept']")!.disabled).toBe(false);
  });

  it("reports a failed async decision to onActionError and re-enables", async () => {
    const onActionError = vi.fn();
    const { host } = mount(
      <ChatThread
        messages={[proposal()]}
        onProposalAccept={() => Promise.reject(new Error("stale version"))}
        onActionError={onActionError}
      />,
    );
    await act(async () => {
      host.querySelector<HTMLButtonElement>("[data-chat-proposal-action='accept']")!.click();
    });
    expect(onActionError).toHaveBeenCalledWith(expect.any(Error), {
      type: "proposal-accept",
      messageId: "p1",
      proposalId: "card-7",
    });
    expect(host.querySelector<HTMLButtonElement>("[data-chat-proposal-action='accept']")!.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Load earlier
// ---------------------------------------------------------------------------

describe("load earlier", () => {
  it("is absent without onLoadEarlier, and hidden when hasEarlier is false", () => {
    const a = mount(<ChatThread messages={many(1)} />);
    expect(a.host.querySelector("[data-react-fancy-chat-thread-load-earlier]")).toBeNull();
    const b = mount(<ChatThread messages={many(1)} onLoadEarlier={() => {}} hasEarlier={false} />);
    expect(b.host.querySelector("[data-react-fancy-chat-thread-load-earlier]")).toBeNull();
  });

  it("calls onLoadEarlier and emits activity; an async load disables the control", async () => {
    let resolve!: () => void;
    const onLoadEarlier = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const onActivity = vi.fn();
    const { host } = mount(
      <ChatThread messages={many(1)} onLoadEarlier={onLoadEarlier} onActivity={onActivity} />,
    );
    const btn = host.querySelector<HTMLButtonElement>("[data-react-fancy-chat-thread-load-earlier]")!;
    click(btn);
    click(btn);
    expect(onLoadEarlier).toHaveBeenCalledTimes(1);
    expect(onActivity).toHaveBeenCalledWith({ type: "load-earlier" });
    expect(btn.disabled).toBe(true);
    await act(async () => {
      resolve();
    });
    expect(btn.disabled).toBe(false);
  });

  it("keeps the reader's place when earlier messages are prepended", () => {
    const { host, rerender } = mount(<ChatThread messages={many(5, 10)} onLoadEarlier={() => {}} />);
    const log = logOf(host);
    // Reader goes to the top to read history (bottom would be 300).
    scrollLogTo(log, 0);
    rerender(<ChatThread messages={[...many(3, 1), ...many(5, 10)]} onLoadEarlier={() => {}} />);
    // Three 100px rows arrived above; the same message stays under the reader.
    expect(log.scrollTop).toBe(300);
  });

  it("does not double-correct when the browser's scroll anchoring already kept the place", () => {
    // Found in Chromium, not jsdom: overflow-anchor had already moved
    // scrollTop by the inserted height, and adding the delta on top of the
    // CURRENT scrollTop pushed the reader five messages past where they were.
    anchoring = true;
    try {
      const { host, rerender } = mount(<ChatThread messages={many(5, 10)} onLoadEarlier={() => {}} />);
      const log = logOf(host);
      scrollLogTo(log, 50); // halfway into message 10
      rerender(<ChatThread messages={[...many(3, 1), ...many(5, 10)]} onLoadEarlier={() => {}} />);
      expect(log.scrollTop).toBe(350); // still halfway into message 10
    } finally {
      anchoring = false;
    }
  });
});

// ---------------------------------------------------------------------------
// Stick to bottom
// ---------------------------------------------------------------------------

describe("stick to bottom without yanking", () => {
  it("starts at the bottom", () => {
    const { host } = mount(<ChatThread messages={many(5)} />);
    expect(logOf(host).scrollTop).toBe(300);
  });

  it("follows new messages while the reader is at the bottom", () => {
    const { host, rerender } = mount(<ChatThread messages={many(5)} />);
    rerender(<ChatThread messages={many(6)} />);
    expect(logOf(host).scrollTop).toBe(400);
    expect(host.querySelector("[data-react-fancy-chat-thread-jump]")).toBeNull();
  });

  it("follows a streaming message as it grows while at the bottom", () => {
    const base = many(4);
    const { host, rerender } = mount(<ChatThread messages={[...base, msg("s", { status: "streaming", content: "a" })]} />);
    expect(logOf(host).scrollTop).toBe(300);
    rerender(<ChatThread messages={[...base, msg("s", { status: "streaming", content: "ab" }), msg("t")]} />);
    expect(logOf(host).scrollTop).toBe(400);
  });

  it("does not move a reader who scrolled up, and offers a jump to the new messages", () => {
    const { host, rerender } = mount(<ChatThread messages={many(5)} />);
    const log = logOf(host);
    scrollLogTo(log, 50);
    rerender(<ChatThread messages={many(7)} />);
    expect(log.scrollTop).toBe(50);
    const jump = host.querySelector("[data-react-fancy-chat-thread-jump]");
    expect(jump).not.toBeNull();
    expect(jump!.textContent).toContain("2 new messages");
    expect(jump!.getAttribute("data-unseen")).toBe("2");
  });

  it("jumps to the latest without scrolling any ancestor, and focuses with preventScroll", () => {
    const scrollIntoView = vi.fn();
    (Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = scrollIntoView;
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const onActivity = vi.fn();
    const { host, rerender } = mount(<ChatThread messages={many(5)} onActivity={onActivity} />);
    const log = logOf(host);
    scrollLogTo(log, 0);
    rerender(<ChatThread messages={many(6)} onActivity={onActivity} />);
    click(host.querySelector("[data-react-fancy-chat-thread-jump]"));
    expect(log.scrollTop).toBe(400);
    expect(host.querySelector("[data-react-fancy-chat-thread-jump]")).toBeNull();
    expect(onActivity).toHaveBeenCalledWith({ type: "jump-to-latest", unseen: 1 });
    // The 5.69 rule: a programmatic focus never scrolls the page.
    for (const call of focus.mock.calls) {
      expect(call[0]).toEqual(expect.objectContaining({ preventScroll: true }));
    }
    expect(focus).toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
    delete (Element.prototype as unknown as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it("clears the unseen count when the reader scrolls back down themselves", () => {
    const { host, rerender } = mount(<ChatThread messages={many(5)} />);
    const log = logOf(host);
    scrollLogTo(log, 0);
    rerender(<ChatThread messages={many(6)} />);
    expect(host.querySelector("[data-react-fancy-chat-thread-jump]")).not.toBeNull();
    scrollLogTo(log, 400);
    expect(host.querySelector("[data-react-fancy-chat-thread-jump]")).toBeNull();
  });

  it("snaps to the viewer's own new message even when scrolled up", () => {
    const { host, rerender } = mount(<ChatThread messages={many(5)} />);
    const log = logOf(host);
    scrollLogTo(log, 0);
    rerender(<ChatThread messages={[...many(5), msg("mine", { role: "user" })]} />);
    expect(log.scrollTop).toBe(400);
  });

  it("does not stick when stickToBottom is false", () => {
    const { host, rerender } = mount(<ChatThread messages={many(5)} stickToBottom={false} />);
    const log = logOf(host);
    expect(log.scrollTop).toBe(0);
    rerender(<ChatThread messages={many(6)} stickToBottom={false} />);
    expect(log.scrollTop).toBe(0);
  });

  it("exposes scrollToLatest and scrollToMessage on a ref, scrolling only the log", () => {
    const ref = createRef<ChatThreadHandle>();
    const { host } = mount(<ChatThread ref={ref} messages={many(5)} />);
    const log = logOf(host);
    const target = messageEl(host, "3")!;
    Object.defineProperty(target, "offsetTop", { configurable: true, value: 200 });
    act(() => ref.current!.scrollToMessage("3"));
    expect(log.scrollTop).toBe(200);
    act(() => ref.current!.scrollToLatest());
    expect(log.scrollTop).toBe(300);
    expect(ref.current!.scrollToMessage("nope")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Separators and grouping
// ---------------------------------------------------------------------------

describe("day separators and grouping", () => {
  const twoDays = [
    msg("1", { createdAt: "2026-10-26T09:00:00" }),
    msg("2", { createdAt: "2026-10-26T18:00:00" }),
    msg("3", { createdAt: "2026-10-27T08:00:00" }),
  ];

  it("has no separators by default", () => {
    const { host } = mount(<ChatThread messages={twoDays} />);
    expect(host.querySelectorAll("[data-chat-day-separator]")).toHaveLength(0);
  });

  it('separates calendar days with separators="day"', () => {
    const { host } = mount(<ChatThread messages={twoDays} separators="day" formatDay={(d) => d.toDateString()} />);
    const seps = host.querySelectorAll("[data-chat-day-separator]");
    expect(seps).toHaveLength(2);
    expect(seps[0].getAttribute("data-chat-day-separator")).toBe("2026-10-26");
    expect(seps[1].getAttribute("data-chat-day-separator")).toBe("2026-10-27");
    expect(seps[1].textContent).toBe(new Date(2026, 9, 27).toDateString());
  });

  it("groups consecutive messages from the same author, and shows the header once", () => {
    const { host } = mount(
      <ChatThread
        groupConsecutive
        messages={[
          msg("1", { role: "staff", author: { name: "Dana" }, createdAt: "2026-10-27T10:00:00" }),
          msg("2", { role: "staff", author: { name: "Dana" }, createdAt: "2026-10-27T10:01:00" }),
          msg("3", { role: "staff", author: { name: "Lee" }, createdAt: "2026-10-27T10:02:00" }),
          // Same author but past the window: a new group.
          msg("4", { role: "staff", author: { name: "Lee" }, createdAt: "2026-10-27T11:00:00" }),
        ]}
      />,
    );
    expect(messageEl(host, "1")!.hasAttribute("data-chat-grouped")).toBe(false);
    expect(messageEl(host, "2")!.hasAttribute("data-chat-grouped")).toBe(true);
    expect(messageEl(host, "2")!.querySelector("[data-chat-author]")).toBeNull();
    expect(messageEl(host, "3")!.hasAttribute("data-chat-grouped")).toBe(false);
    expect(messageEl(host, "4")!.hasAttribute("data-chat-grouped")).toBe(false);
  });

  it("never groups an internal note with a public message", () => {
    const { host } = mount(
      <ChatThread
        groupConsecutive
        messages={[
          msg("1", { role: "staff", author: { name: "Dana" } }),
          msg("2", { role: "staff", author: { name: "Dana" }, visibility: "internal" }),
        ]}
      />,
    );
    expect(messageEl(host, "2")!.hasAttribute("data-chat-grouped")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Standalone ChatMessage + root export
// ---------------------------------------------------------------------------

describe("ChatMessage on its own, and the root export", () => {
  it("renders a single message outside a thread", () => {
    const { host } = mount(<ChatMessage message={msg("solo", { content: "*hi*" })} actions={<span data-x="" />} />);
    const el = messageEl(host, "solo")!;
    expect(el.querySelector("em")!.textContent).toBe("hi");
    expect(el.querySelector("[data-chat-message-actions] [data-x]")).not.toBeNull();
  });

  it("is exported from the package root", () => {
    expect(packageRoot.ChatThread).toBe(ChatThread);
    expect(packageRoot.ChatMessage).toBe(ChatMessage);
  });
});

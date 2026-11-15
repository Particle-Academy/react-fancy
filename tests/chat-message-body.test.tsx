// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ChatMessage, type ChatMessageData } from "../src/components/ChatThread";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CC-fancy-0042: an agent message is a list of typed parts (text, code, a
 * table, a card, tool rows), not one markdown string. `body` lets a host render
 * those parts INSIDE the bubble while ChatMessage keeps everything else it owns:
 * the header, author, time, status, attachments, actions, proposal and handles.
 */

const mounted: Array<() => void> = [];
function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root: Root = createRoot(host);
  act(() => root.render(el));
  mounted.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return { host };
}
afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

const msg = (over: Partial<ChatMessageData> = {}): ChatMessageData => ({
  id: "m1",
  role: "assistant",
  content: "**markdown content**",
  createdAt: "2026-11-15T10:00:00.000Z",
  author: { id: "a", name: "Compass" },
  ...over,
});

describe("ChatMessage body", () => {
  it("renders the body inside the bubble in place of the markdown content", () => {
    const { host } = mount(<ChatMessage message={msg()} body={<div data-parts="">typed parts</div>} />);
    const bubble = host.querySelector("[data-chat-bubble]")!;
    expect(bubble.querySelector("[data-parts]")).not.toBeNull();
    expect(bubble.querySelector("[data-chat-content] [data-parts]")).not.toBeNull();
    expect(host.textContent).not.toContain("markdown content");
    expect(host.querySelector("[data-react-fancy-content-renderer]")).toBeNull();
  });

  it("keeps the header, status, attachments, actions and handles", () => {
    const { host } = mount(
      <ChatMessage
        message={msg({ status: "failed", attachments: [{ id: "f1", name: "a.pdf" }] })}
        actions={<button data-act="">Retry</button>}
        body={<div data-parts="">typed parts</div>}
      />,
    );
    const root = host.querySelector("[data-chat-message='m1']")!;
    expect(root.getAttribute("data-chat-role")).toBe("assistant");
    expect(root.getAttribute("data-chat-status")).toBe("failed");
    expect(host.querySelector("[data-chat-author]")!.textContent).toBe("Compass");
    expect(host.querySelector("time")).not.toBeNull();
    expect(host.querySelector("[data-chat-attachment='f1']")).not.toBeNull();
    expect(host.querySelector("[data-chat-message-actions] [data-act]")).not.toBeNull();
    expect(host.querySelector("[data-chat-status-text='failed']")).not.toBeNull();
  });

  it("works inside a proposal bubble, keeping the proposal header and decision buttons", () => {
    const { host } = mount(
      <ChatMessage
        message={msg({ proposal: { id: "p1", title: "Send it?" } })}
        onProposalAccept={() => {}}
        body={<div data-parts="">preview parts</div>}
      />,
    );
    const proposal = host.querySelector("[data-chat-proposal='p1']")!;
    expect(proposal.querySelector("[data-parts]")).not.toBeNull();
    expect(proposal.querySelector("[data-chat-proposal-header]")).not.toBeNull();
    expect(proposal.querySelector("[data-chat-proposal-action='accept']")).not.toBeNull();
  });

  it("works for a system message", () => {
    const { host } = mount(<ChatMessage message={msg({ role: "system" })} body={<span data-parts="">compacted</span>} />);
    expect(host.querySelector("[data-chat-content] [data-parts]")).not.toBeNull();
    expect(host.textContent).not.toContain("markdown content");
  });

  it("without a body, nothing changes", () => {
    const { host } = mount(<ChatMessage message={msg()} />);
    expect(host.querySelector("[data-react-fancy-content-renderer]")).not.toBeNull();
    expect(host.textContent).toContain("markdown content");
  });
});

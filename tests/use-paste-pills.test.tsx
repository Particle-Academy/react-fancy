// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { usePastePills } from "../src/hooks/use-paste-pills";
import type { HeldPaste } from "../src/index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/** The minimum of a ClipboardEvent the hook is allowed to touch. */
function clipboard(text: string) {
  let prevented = false;

  return {
    event: {
      clipboardData: { getData: () => text },
      preventDefault: () => {
        prevented = true;
      },
    },
    wasPrevented: () => prevented,
  };
}

const WALL = "A".repeat(2036);

/**
 * `usePastePills` — the paste-holding logic, without a surface.
 *
 * Requested by the MOIC estate after they established something I had missed: their
 * chat input is a contenteditable that renders inline `[deal:42|Acme]` badges, so
 * they CANNOT adopt `Composer` (a plain textarea) however much they like its
 * behaviour. Their original plan was to delete their composer when ours shipped;
 * that plan could not land.
 *
 * So the logic moves here and `Composer` becomes its first caller — one
 * implementation, not two. That matters more than the convenience: two copies of a
 * rule drift, and the one nobody reads is the one that rots.
 *
 * Their constraints, which shaped the API:
 *
 *   - **The hook must not own the DOM.** It returns state and callbacks; the host
 *     renders the pills, because theirs sit above a contenteditable and their hover
 *     popover is their own component.
 *   - **`handlePaste` must be COMPOSABLE** — callable from inside their own paste
 *     handler (which already intercepts paste for tag resolution) and reporting
 *     whether it consumed the event, rather than being attached directly.
 *   - **Controllable held pastes**, because their send path assembles the outgoing
 *     message where tag resolution happens.
 */
describe("usePastePills", () => {
  function Probe({
    threshold,
    onResult,
  }: {
    threshold?: number;
    onResult: (r: ReturnType<typeof usePastePills>) => void;
  }) {
    const result = usePastePills({ threshold });
    onResult(result);
    return <div data-count={result.heldPastes.length} />;
  }

  function latest<T>(box: { current: T | null }): T {
    if (box.current === null) throw new Error("hook never reported");
    return box.current;
  }

  it("holds a paste at or over the threshold and reports that it consumed the event", () => {
    const box: { current: ReturnType<typeof usePastePills> | null } = { current: null };
    const { unmount } = mount(
      <Probe threshold={500} onResult={(r) => (box.current = r)} />,
    );

    const { event, wasPrevented } = clipboard(WALL);
    let consumed = false;
    act(() => {
      consumed = latest(box).handlePaste(event);
    });

    expect(consumed).toBe(true);
    expect(wasPrevented()).toBe(true);
    expect(latest(box).heldPastes).toHaveLength(1);
    expect(latest(box).heldPastes[0].text).toBe(WALL);

    unmount();
  });

  it("DOES NOT consume an ordinary paste, and leaves the event alone", () => {
    // The composability contract. A host calling this from inside its own handler
    // must be able to carry on when the hook declines -- and the hook must not have
    // touched the event on the way past.
    const box: { current: ReturnType<typeof usePastePills> | null } = { current: null };
    const { unmount } = mount(
      <Probe threshold={500} onResult={(r) => (box.current = r)} />,
    );

    const { event, wasPrevented } = clipboard("12 Acacia Avenue");
    let consumed = true;
    act(() => {
      consumed = latest(box).handlePaste(event);
    });

    expect(consumed).toBe(false);
    expect(wasPrevented()).toBe(false);
    expect(latest(box).heldPastes).toHaveLength(0);

    unmount();
  });

  it("does nothing without a threshold, and says so by returning false", () => {
    const box: { current: ReturnType<typeof usePastePills> | null } = { current: null };
    const { unmount } = mount(<Probe onResult={(r) => (box.current = r)} />);

    const { event, wasPrevented } = clipboard(WALL);
    let consumed = true;
    act(() => {
      consumed = latest(box).handlePaste(event);
    });

    expect(consumed).toBe(false);
    expect(wasPrevented()).toBe(false);
    expect(latest(box).heldPastes).toHaveLength(0);

    unmount();
  });

  it("expand(id) returns the text AND removes the pill", () => {
    // The host inserts it into its own surface -- the hook cannot, and must not try.
    const box: { current: ReturnType<typeof usePastePills> | null } = { current: null };
    const { unmount } = mount(
      <Probe threshold={500} onResult={(r) => (box.current = r)} />,
    );

    act(() => {
      latest(box).handlePaste(clipboard(WALL).event);
    });
    const id = latest(box).heldPastes[0].id;

    let text: string | undefined;
    act(() => {
      text = latest(box).expand(id);
    });

    expect(text).toBe(WALL);
    expect(latest(box).heldPastes).toHaveLength(0);

    unmount();
  });

  it("expand of an unknown id returns undefined rather than throwing", () => {
    const box: { current: ReturnType<typeof usePastePills> | null } = { current: null };
    const { unmount } = mount(
      <Probe threshold={500} onResult={(r) => (box.current = r)} />,
    );

    let text: string | undefined = "not undefined";
    act(() => {
      text = latest(box).expand("no-such-id");
    });

    expect(text).toBeUndefined();

    unmount();
  });

  it("remove(id) discards one without returning it", () => {
    const box: { current: ReturnType<typeof usePastePills> | null } = { current: null };
    const { unmount } = mount(
      <Probe threshold={500} onResult={(r) => (box.current = r)} />,
    );

    act(() => {
      latest(box).handlePaste(clipboard("A".repeat(600)).event);
      latest(box).handlePaste(clipboard("B".repeat(600)).event);
    });

    expect(latest(box).heldPastes).toHaveLength(2);
    const first = latest(box).heldPastes[0].id;

    act(() => {
      latest(box).remove(first);
    });

    expect(latest(box).heldPastes).toHaveLength(1);
    expect(latest(box).heldPastes[0].text.startsWith("B")).toBe(true);

    unmount();
  });

  it("clear() empties them, for after a send", () => {
    const box: { current: ReturnType<typeof usePastePills> | null } = { current: null };
    const { unmount } = mount(
      <Probe threshold={500} onResult={(r) => (box.current = r)} />,
    );

    act(() => {
      latest(box).handlePaste(clipboard(WALL).event);
    });
    act(() => {
      latest(box).clear();
    });

    expect(latest(box).heldPastes).toHaveLength(0);

    unmount();
  });

  it("ids are stable across re-renders and unique between pastes", () => {
    // The host keys its own DOM on these. An id that changes identity on render
    // would remount every pill and lose hover state.
    const box: { current: ReturnType<typeof usePastePills> | null } = { current: null };
    const seen: string[][] = [];
    const { unmount } = mount(
      <Probe
        threshold={500}
        onResult={(r) => {
          box.current = r;
          seen.push(r.heldPastes.map((p) => p.id));
        }}
      />,
    );

    act(() => {
      latest(box).handlePaste(clipboard("A".repeat(600)).event);
    });
    const afterFirst = latest(box).heldPastes[0].id;

    act(() => {
      latest(box).handlePaste(clipboard("B".repeat(600)).event);
    });

    const ids = latest(box).heldPastes.map((p) => p.id);

    expect(ids[0]).toBe(afterFirst);
    expect(new Set(ids).size).toBe(2);

    unmount();
  });

  it("accepts a CONTROLLED list, which is how MOIC needs it", () => {
    // Their send path assembles the outgoing message where tag resolution happens,
    // so they own the state.
    function Controlled() {
      const [pastes, setPastes] = useState<HeldPaste[]>([]);
      const pills = usePastePills({
        threshold: 500,
        heldPastes: pastes,
        onHeldPastesChange: setPastes,
      });

      return (
        <button
          type="button"
          data-held={pastes.length}
          onClick={() => pills.handlePaste(clipboard(WALL).event)}
        >
          paste
        </button>
      );
    }

    const { host, unmount } = mount(<Controlled />);
    const button = host.querySelector("button")!;

    expect(button.getAttribute("data-held")).toBe("0");

    act(() => {
      button.click();
    });

    expect(button.getAttribute("data-held")).toBe("1");

    unmount();
  });

  it("tolerates a clipboard event carrying nothing", () => {
    // Pasting an image gives a clipboardData whose text/plain is empty, and some
    // synthetic events have no clipboardData at all. Neither is a crash.
    const box: { current: ReturnType<typeof usePastePills> | null } = { current: null };
    const { unmount } = mount(
      <Probe threshold={500} onResult={(r) => (box.current = r)} />,
    );

    let consumed = true;
    act(() => {
      consumed = latest(box).handlePaste({ preventDefault: () => {} });
    });

    expect(consumed).toBe(false);
    expect(latest(box).heldPastes).toHaveLength(0);

    unmount();
  });
});

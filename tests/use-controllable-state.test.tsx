// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { useControllableState } from "../src/hooks/use-controllable-state";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, unmount: () => act(() => root.unmount()) };
}

/**
 * Two functional updates in ONE batch must both apply.
 *
 * This hook resolved a functional update against the render closure's `value` and
 * handed React a pre-computed result, so `setValue(fn)` twice before a re-render had
 * both calls compute from the same stale value and **the first was silently lost.**
 *
 * It is used by most stateful components in this library, so the blast radius was
 * everything — but it only shows when a caller updates twice in a batch, which is
 * why it survived. Found by a `usePastePills` test that held two pastes inside one
 * `act()` and got one, with nothing to suggest an update had gone missing.
 *
 * The symptom is the dangerous kind: not an error, just less state than you asked
 * for.
 */
describe("useControllableState", () => {
  function Counter({ onRender }: { onRender?: (setter: unknown) => void }) {
    const [items, setItems] = useControllableState<string[]>(undefined, []);
    onRender?.(setItems);

    return (
      <button
        type="button"
        data-items={items.join(",")}
        data-count={items.length}
        onClick={() => {
          // TWO functional updates, one batch. The whole point.
          setItems((current) => [...current, "a"]);
          setItems((current) => [...current, "b"]);
        }}
      >
        add two
      </button>
    );
  }

  it("applies BOTH functional updates batched in one handler", () => {
    const { host, unmount } = mount(<Counter />);
    const button = host.querySelector("button")!;

    act(() => button.click());

    expect(button.getAttribute("data-count")).toBe("2");
    expect(button.getAttribute("data-items")).toBe("a,b");

    unmount();
  });

  it("reports every intermediate value to onChange, in order", () => {
    // A host listening to onChange must not miss one either.
    const seen: string[][] = [];

    function Listening() {
      const [items, setItems] = useControllableState<string[]>(undefined, [], (v) =>
        seen.push(v),
      );

      return (
        <button
          type="button"
          data-count={items.length}
          onClick={() => {
            setItems((c) => [...c, "a"]);
            setItems((c) => [...c, "b"]);
          }}
        >
          add
        </button>
      );
    }

    const { host, unmount } = mount(<Listening />);
    act(() => host.querySelector("button")!.click());

    expect(seen).toEqual([["a"], ["a", "b"]]);

    unmount();
  });

  it("a CONTROLLED parent that applies the change sees both", () => {
    function Parent() {
      const [items, setItems] = useState<string[]>([]);

      return <Child items={items} onChange={setItems} />;
    }

    function Child({
      items,
      onChange,
    }: {
      items: string[];
      onChange: (v: string[]) => void;
    }) {
      const [value, setValue] = useControllableState(items, [], onChange);

      return (
        <button
          type="button"
          data-count={value.length}
          onClick={() => {
            setValue((c) => [...c, "a"]);
            setValue((c) => [...c, "b"]);
          }}
        >
          add
        </button>
      );
    }

    const { host, unmount } = mount(<Parent />);
    const button = host.querySelector("button")!;

    act(() => button.click());

    expect(button.getAttribute("data-count")).toBe("2");

    unmount();
  });

  it("a controlled parent that IGNORES onChange still wins", () => {
    // The ref carries intent within a batch; it must not become a second source of
    // truth that outlives the render. A parent pinning the value keeps it pinned.
    function Pinned() {
      const [value, setValue] = useControllableState<string[]>(["fixed"], [], () => {
        /* deliberately ignored */
      });

      return (
        <button
          type="button"
          data-items={value.join(",")}
          onClick={() => setValue((c) => [...c, "nope"])}
        >
          try
        </button>
      );
    }

    const { host, unmount } = mount(<Pinned />);
    const button = host.querySelector("button")!;

    act(() => button.click());

    expect(button.getAttribute("data-items")).toBe("fixed");

    unmount();
  });

  it("the setter is stable across renders", () => {
    // It used to depend on `value`, so it changed identity on every update — which
    // invalidates every consumer's useCallback/useEffect that depends on it.
    const setters: unknown[] = [];

    const { host, unmount } = mount(
      <Counter onRender={(setter) => setters.push(setter)} />,
    );

    act(() => host.querySelector("button")!.click());

    expect(setters.length).toBeGreaterThan(1);
    expect(new Set(setters).size).toBe(1);

    unmount();
  });
});

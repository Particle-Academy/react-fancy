// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Autocomplete } from "../src/components/Autocomplete";
import type { AutocompleteOption } from "../src/components/Autocomplete/Autocomplete.types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `onSearch` sat in the dependency array of the effect that calls it, so the
 * documented usage, an inline `onSearch` that sets the options, looped: the
 * call set state, the parent re-rendered with a new function, the effect saw a
 * new dependency and called it again. With a fresh options array each time it
 * never settled (a request storm when the callback fetches). It now fires when
 * the QUERY changes, whatever the callback's identity.
 */

const mounted: Array<() => void> = [];
afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

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

const ALL: AutocompleteOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
];

// A safety cap so the old code fails the assertion instead of hanging the run.
const CAP = 100;

function Host({ calls }: { calls: string[] }) {
  const [options, setOptions] = useState<AutocompleteOption[]>(ALL);
  return (
    <Autocomplete
      options={options}
      onSearch={(q) => {
        calls.push(q);
        if (calls.length > CAP) return;
        setOptions(ALL.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())));
      }}
    />
  );
}

function type(input: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("Autocomplete onSearch with an inline callback that sets state", () => {
  it("is called once on mount and once per query change, not in a loop", () => {
    const calls: string[] = [];
    const host = mount(<Host calls={calls} />);
    expect(calls).toEqual([""]);

    type(host.querySelector("input")!, "ap");
    expect(calls).toEqual(["", "ap"]);
  });
});

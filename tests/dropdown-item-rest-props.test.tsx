// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Dropdown } from "../src/components/Dropdown";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Dropdown.Item destructured its five named props and spread nothing, so a
 * `data-*` handle typechecked (hyphenated JSX attributes are never checked)
 * and was nowhere in the DOM. Every interactive element owes a stable handle.
 */

const mounted: Array<() => void> = [];

// Unmount in afterEach, so a failed assertion cannot leak a portalled panel
// into the next test's document.querySelector.
afterEach(() => {
  while (mounted.length) mounted.pop()!();
});

function mount(el: ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(el));
  let done = false;
  const unmount = () => {
    if (done) return;
    done = true;
    act(() => root.unmount());
    host.remove();
  };
  mounted.push(unmount);
  return { host, unmount };
}

function openMenu(items: ReactElement) {
  const m = mount(
    <Dropdown>
      <Dropdown.Trigger>
        <button type="button" data-testid="trigger">
          Account
        </button>
      </Dropdown.Trigger>
      <Dropdown.Items>{items}</Dropdown.Items>
    </Dropdown>,
  );
  const trigger = m.host.querySelector<HTMLElement>('[data-testid="trigger"]')!;
  act(() => trigger.click());
  // The menu mounts after the animation + Portal each take a render.
  act(() => {});
  act(() => {});
  return m;
}

const item = () => document.querySelector<HTMLElement>("[data-react-fancy-dropdown-item]");

describe("Dropdown.Item forwards rest props", () => {
  it("renders data-* handles on the item element", () => {
    const m = openMenu(
      <Dropdown.Item data-testid="x" data-handle="y">
        Profile
      </Dropdown.Item>,
    );
    const el = item()!;
    expect(el).not.toBeNull();
    expect(el.getAttribute("data-testid")).toBe("x");
    expect(el.getAttribute("data-handle")).toBe("y");
    m.unmount();
  });

  it("forwards id, aria-* and title too", () => {
    const m = openMenu(
      <Dropdown.Item id="profile-item" aria-describedby="hint" title="Your profile">
        Profile
      </Dropdown.Item>,
    );
    const el = item()!;
    expect(el.id).toBe("profile-item");
    expect(el.getAttribute("aria-describedby")).toBe("hint");
    expect(el.getAttribute("title")).toBe("Your profile");
    m.unmount();
  });

  it("keeps its own role, type, marker and click-then-close behaviour", () => {
    const onClick = vi.fn();
    const m = openMenu(
      <Dropdown.Item data-handle="y" onClick={onClick} className="mine">
        Profile
      </Dropdown.Item>,
    );
    const el = item()!;
    expect(el.getAttribute("role")).toBe("menuitem");
    expect(el.getAttribute("type")).toBe("button");
    expect(el.className).toContain("mine");
    expect(el.className).toContain("rounded-lg");
    act(() => el.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    act(() => {});
    act(() => {});
    expect(document.querySelector("[data-react-fancy-dropdown]")).toBeNull();
    m.unmount();
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    const m = openMenu(
      <Dropdown.Item disabled onClick={onClick} data-handle="y">
        Profile
      </Dropdown.Item>,
    );
    const el = item()!;
    expect(el.hasAttribute("disabled")).toBe(true);
    act(() => el.click());
    expect(onClick).not.toHaveBeenCalled();
    m.unmount();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Input } from "../src/components/inputs/Input";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

function mount(el: ReactElement): HTMLElement {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    roots.push(root);
    act(() => root.render(el));
    return host;
}

afterEach(() => {
    act(() => roots.splice(0).forEach((r) => r.unmount()));
    document.body.innerHTML = "";
});

const field = (h: HTMLElement) => h.querySelector<HTMLInputElement>("input")!;
const toggle = (h: HTMLElement) => h.querySelector<HTMLButtonElement>("[data-react-fancy-reveal]");

describe("Input reveal", () => {
    it("renders no toggle unless asked for one", () => {
        expect(toggle(mount(<Input type="password" />))).toBeNull();
    });

    it("renders a toggle on a password field when asked", () => {
        const host = mount(<Input type="password" reveal />);

        expect(toggle(host)).not.toBeNull();
        expect(field(host).type).toBe("password");
    });

    it("ignores reveal on a field that is already visible", () => {
        // A reveal on a text input is a button that does nothing.
        expect(toggle(mount(<Input type="text" reveal />))).toBeNull();
        expect(toggle(mount(<Input type="email" reveal />))).toBeNull();
    });

    it("swaps the rendered type when toggled, and back again", () => {
        const host = mount(<Input type="password" reveal />);

        act(() => toggle(host)!.click());
        expect(field(host).type).toBe("text");

        act(() => toggle(host)!.click());
        expect(field(host).type).toBe("password");
    });

    it("is a button, not a submit — the whole point in a login form", () => {
        // The default for <button> is type="submit". Without this, revealing a
        // password inside a form submits the form.
        const host = mount(<Input type="password" reveal />);

        expect(toggle(host)!.type).toBe("button");
    });

    it("does not submit the form it lives in", () => {
        const onSubmit = vi.fn((e: Event) => e.preventDefault());
        const host = mount(
            <form>
                <Input type="password" reveal />
            </form>,
        );
        host.querySelector("form")!.addEventListener("submit", onSubmit);

        act(() => toggle(host)!.click());

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("announces its state and what it controls", () => {
        const host = mount(<Input id="pw" type="password" reveal />);
        const btn = toggle(host)!;

        expect(btn.getAttribute("aria-pressed")).toBe("false");
        expect(btn.getAttribute("aria-controls")).toBe("pw");
        expect(btn.getAttribute("aria-label")).toBe("Show password");

        act(() => btn.click());

        expect(btn.getAttribute("aria-pressed")).toBe("true");
        expect(btn.getAttribute("aria-label")).toBe("Hide password");
    });

    it("takes custom labels", () => {
        const host = mount(<Input type="password" reveal revealLabel="Reveal" hideLabel="Conceal" />);

        expect(toggle(host)!.getAttribute("aria-label")).toBe("Reveal");
    });

    it("stays out of the tab order", () => {
        // The path through a login form is field → submit. A reveal in between
        // is a stop most people do not want; it stays reachable by click and to
        // screen readers.
        expect(toggle(mount(<Input type="password" reveal />))!.tabIndex).toBe(-1);
    });

    it("can be driven from outside, and reports its own changes", () => {
        const onRevealedChange = vi.fn();
        const host = mount(<Input type="password" reveal revealed onRevealedChange={onRevealedChange} />);

        // Controlled: it renders what it was given...
        expect(field(host).type).toBe("text");

        act(() => toggle(host)!.click());

        // ...reports the intent, and does NOT move itself.
        expect(onRevealedChange).toHaveBeenCalledWith(false);
        expect(field(host).type).toBe("text");
    });

    it("disables the toggle with the field", () => {
        const host = mount(<Input type="password" reveal disabled />);

        expect(toggle(host)!.disabled).toBe(true);
    });

    it("keeps the declared type as password so the value stays masked in display mode", () => {
        // `mode="view"` renders the value as text. A revealed password must not
        // leak into that path, so the DECLARED type stays "password" and only
        // the rendered one changes.
        const host = mount(<Input type="password" reveal mode="view" value="hunter2" readOnly />);

        expect(host.textContent).not.toContain("hunter2");
    });

    it("replaces `trailing` rather than stacking on top of it", () => {
        // Both occupy the same corner. Rendering both puts an icon under the
        // button, which looks like a rendering bug.
        const host = mount(<Input type="password" reveal trailing={<span data-x>x</span>} />);

        expect(toggle(host)).not.toBeNull();
        expect(host.querySelector("[data-x]")).toBeNull();
    });
});

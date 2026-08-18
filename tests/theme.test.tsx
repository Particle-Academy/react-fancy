// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
    getThemePreference,
    initTheme,
    resolveTheme,
    setThemePreference,
    subscribeTheme,
    THEME_STORAGE_KEY,
} from "../src/theme";
import { useTheme } from "../src/hooks/use-theme";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * jsdom implements no matchMedia, so the OS preference is stubbed here -- and
 * stubbed in a way that can CHANGE mid-test, which is the whole point. "System"
 * is not a synonym for "read the OS once at boot": if it does not follow the OS
 * while the page is open, it is just a default, and the tests below say so.
 */
type Listener = (event: { matches: boolean }) => void;
let osPrefersDark = false;
const listeners = new Set<Listener>();

beforeEach(() => {
    osPrefersDark = false;
    listeners.clear();
    window.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");

    window.matchMedia = ((query: string) => ({
        media: query,
        get matches() {
            return query.includes("dark") ? osPrefersDark : false;
        },
        addEventListener: (_: string, listener: Listener) => listeners.add(listener),
        removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
        dispatchEvent: () => true,
        onchange: null,
    })) as unknown as typeof window.matchMedia;
});

/** Simulate the user changing their OS theme with the page open. */
function setOsDark(value: boolean): void {
    osPrefersDark = value;
    act(() => {
        listeners.forEach((listener) => listener({ matches: value }));
    });
}

const disposers: Array<() => void> = [];
const roots: Root[] = [];

afterEach(() => {
    disposers.splice(0).forEach((dispose) => dispose());
    act(() => roots.splice(0).forEach((root) => root.unmount()));
});

function start(): void {
    disposers.push(initTheme());
}

const isDark = () => document.documentElement.classList.contains("dark");

describe("theme preference", () => {
    it("defaults to following the system, not to light", () => {
        osPrefersDark = true;
        start();

        expect(getThemePreference()).toBe("system");
        expect(isDark()).toBe(true);
    });

    it("follows the OS while the page is open", () => {
        start();
        expect(isDark()).toBe(false);

        setOsDark(true);
        expect(isDark()).toBe(true);

        setOsDark(false);
        expect(isDark()).toBe(false);
    });

    it("stops following the OS once a theme is chosen explicitly", () => {
        start();
        setThemePreference("light");

        setOsDark(true);

        expect(isDark()).toBe(false);
        expect(getThemePreference()).toBe("light");
    });

    it("can go back to following the system, which clears the stored choice", () => {
        start();
        setThemePreference("dark");
        expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

        setThemePreference("system");

        // Nothing stored means nothing to migrate and no stale choice to
        // out-live a change of mind -- "system" is the absence of a choice.
        expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
        setOsDark(true);
        expect(isDark()).toBe(true);
    });

    it("sets data-theme alongside the class, for CSS that keys off either", () => {
        start();
        setThemePreference("dark");

        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("reports the resolved theme, not the preference", () => {
        osPrefersDark = true;
        start();

        expect(getThemePreference()).toBe("system");
        expect(resolveTheme()).toBe("dark");
    });

    it("notifies subscribers with both the resolved theme and the preference", () => {
        start();
        const seen: Array<[string, string]> = [];
        disposers.push(subscribeTheme((resolved, preference) => seen.push([resolved, preference])));

        setThemePreference("dark");
        setOsDark(true);

        expect(seen[0]).toEqual(["dark", "dark"]);
    });
});

describe("useTheme", () => {
    function mount(): { host: HTMLElement } {
        const host = document.createElement("div");
        document.body.append(host);
        const root = createRoot(host);
        roots.push(root);

        function Probe() {
            const { resolved, preference, setPreference } = useTheme();
            return (
                <button data-testid="probe" onClick={() => setPreference("dark")}>
                    {preference}/{resolved}
                </button>
            );
        }

        act(() => root.render(<Probe />));
        return { host };
    }

    it("re-renders when the OS theme changes underneath it", () => {
        start();
        const { host } = mount();
        expect(host.textContent).toBe("system/light");

        setOsDark(true);

        expect(host.textContent).toBe("system/dark");
    });

    it("sets the preference through the hook", () => {
        start();
        const { host } = mount();

        act(() => {
            host.querySelector<HTMLButtonElement>('[data-testid="probe"]')!.click();
        });

        expect(host.textContent).toBe("dark/dark");
        expect(isDark()).toBe(true);
    });
});

/**
 * Light / dark / **system** theming.
 *
 * `styles.css` in this package defines the dark contract — it redefines the
 * whole `--color-secondary-*` scale under `:where(.dark)` so that "900" always
 * means strongest foreground and "50" always means faintest surface. This module
 * is the other half of that contract: the thing that decides when `.dark` is on.
 *
 * It lives here rather than in each app because every consumer was hand-rolling
 * it, and every hand-rolled copy had the same two holes:
 *
 *  - **No live listener.** The OS preference was read once at boot, so changing
 *    the system theme with the page open did nothing. That is a default, not a
 *    "system" mode.
 *  - **No way back.** Choosing light or dark wrote to storage forever, so
 *    "follow my system" was unreachable after a single click.
 *
 * Both are fixed by treating **"system" as the absence of a stored choice**
 * rather than as a third stored value.
 *
 * Every export is safe to call during SSR, where it is a no-op that resolves to
 * `"light"`. Pair it with `useTheme`, which deliberately renders `system/light`
 * on the server and syncs in an effect — this project has paid for hydration
 * mismatches caused by reading the real theme during render.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/**
 * Deliberately the key the showcase already used, so adopting this module keeps
 * a returning visitor's saved choice instead of silently resetting it.
 */
export const THEME_STORAGE_KEY = "fancy-ui.theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

type ThemeListener = (resolved: ResolvedTheme, preference: ThemePreference) => void;

const listeners = new Set<ThemeListener>();
let storageKey = THEME_STORAGE_KEY;
let stopWatchingSystem: (() => void) | null = null;

function canUseDom(): boolean {
    return typeof window !== "undefined" && typeof document !== "undefined";
}

/** The stored choice, or `"system"` when there isn't one. */
export function getThemePreference(): ThemePreference {
    if (!canUseDom()) return "system";
    try {
        const saved = window.localStorage.getItem(storageKey);
        return saved === "light" || saved === "dark" ? saved : "system";
    } catch {
        // Private browsing and blocked storage both throw here. A theme is not
        // worth taking the page down over.
        return "system";
    }
}

function systemTheme(): ResolvedTheme {
    if (!canUseDom() || typeof window.matchMedia !== "function") return "light";
    return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** What is actually on screen, as opposed to what the user asked for. */
export function resolveTheme(preference: ThemePreference = getThemePreference()): ResolvedTheme {
    return preference === "system" ? systemTheme() : preference;
}

function applyToDocument(resolved: ResolvedTheme): void {
    if (!canUseDom()) return;
    const root = document.documentElement;
    // The class is what this package's CSS keys off; the attribute is for
    // consumers whose own styles key off `[data-theme]`.
    root.classList.toggle("dark", resolved === "dark");
    root.setAttribute("data-theme", resolved);
}

function publish(): void {
    const preference = getThemePreference();
    const resolved = resolveTheme(preference);
    applyToDocument(resolved);
    listeners.forEach((listener) => listener(resolved, preference));
}

/**
 * Choose a theme. `"system"` REMOVES the stored value rather than storing the
 * string — an absent choice is what lets the OS keep speaking for the user.
 */
export function setThemePreference(preference: ThemePreference): void {
    if (canUseDom()) {
        try {
            if (preference === "system") {
                window.localStorage.removeItem(storageKey);
            } else {
                window.localStorage.setItem(storageKey, preference);
            }
        } catch {
            // As above: still apply it for this page even if it cannot persist.
        }
    }
    publish();
}

/** Observe theme changes. Returns an unsubscribe. */
export function subscribeTheme(listener: ThemeListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Apply the current theme and start following the OS. Call once, as early as
 * possible — before first paint if you want to avoid a flash of the wrong
 * theme. Returns a disposer; calling it again is harmless.
 */
export function initTheme(options: { storageKey?: string } = {}): () => void {
    if (options.storageKey) storageKey = options.storageKey;
    if (!canUseDom()) return () => {};

    applyToDocument(resolveTheme());

    if (!stopWatchingSystem && typeof window.matchMedia === "function") {
        const media = window.matchMedia(DARK_QUERY);
        const onSystemChange = (): void => {
            // Only "system" follows the OS. An explicit choice has to survive
            // the user switching their OS theme, or it isn't a choice.
            if (getThemePreference() === "system") publish();
        };

        if (typeof media.addEventListener === "function") {
            media.addEventListener("change", onSystemChange);
            stopWatchingSystem = () => media.removeEventListener("change", onSystemChange);
        } else {
            // Safari < 14 and friends.
            media.addListener(onSystemChange);
            stopWatchingSystem = () => media.removeListener(onSystemChange);
        }
    }

    return () => {
        stopWatchingSystem?.();
        stopWatchingSystem = null;
    };
}

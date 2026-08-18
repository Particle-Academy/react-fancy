import { useCallback, useEffect, useState } from "react";
import {
    getThemePreference,
    resolveTheme,
    setThemePreference,
    subscribeTheme,
    type ResolvedTheme,
    type ThemePreference,
} from "../theme";

export type UseThemeResult = {
    /** What the user asked for, including `"system"`. */
    preference: ThemePreference;
    /** What is actually on screen. */
    resolved: ResolvedTheme;
    setPreference: (preference: ThemePreference) => void;
};

/**
 * Read and set the theme from a component, re-rendering when it changes —
 * including when the OS theme changes underneath a `"system"` preference.
 *
 * The initial state is deliberately `system` / `light` rather than the real
 * theme: the server has neither storage nor an OS preference, so reading the
 * truth during render is exactly the hydration mismatch this project has
 * already chased down more than once. The effect syncs immediately on mount.
 */
export function useTheme(): UseThemeResult {
    const [state, setState] = useState<{ preference: ThemePreference; resolved: ResolvedTheme }>({
        preference: "system",
        resolved: "light",
    });

    useEffect(() => {
        const sync = (): void => {
            setState({ preference: getThemePreference(), resolved: resolveTheme() });
        };
        sync();
        return subscribeTheme(sync);
    }, []);

    const setPreference = useCallback((preference: ThemePreference): void => {
        setThemePreference(preference);
    }, []);

    return { ...state, setPreference };
}

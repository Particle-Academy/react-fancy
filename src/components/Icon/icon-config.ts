import type { ComponentType } from "react";
import type { IconSet } from "./icon-config.types";

const registry = new Map<string, IconSet>();
let defaultSetName = "lucide";

function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Register individual icon components by their kebab-case name.
 *
 * ```tsx
 * import { registerIcons } from "@particle-academy/react-fancy";
 * import { Home, Settings, Mail } from "lucide-react";
 *
 * registerIcons({ Home, Settings, Mail });
 * ```
 *
 * Icons are registered into the default "lucide" icon set and resolved
 * by the `<Icon name="home" />` component using kebab-case names.
 */
export function registerIcons(
  icons: Record<string, ComponentType<{ className?: string; size?: number }>>,
): void {
  let set = registry.get("lucide");
  if (!set) {
    const map = new Map<string, ComponentType<{ className?: string; size?: number }>>();
    set = {
      resolve: (name: string) => {
        const pascal = kebabToPascal(name);
        return map.get(pascal) ?? null;
      },
      _map: map,
    } as IconSet & { _map: Map<string, ComponentType<{ className?: string; size?: number }>> };
    registry.set("lucide", set);
  }
  const map = (set as IconSet & { _map: Map<string, ComponentType<{ className?: string; size?: number }>> })._map;
  for (const [key, component] of Object.entries(icons)) {
    map.set(key, component);
  }
}

export function registerIconSet(name: string, set: IconSet): void {
  registry.set(name, set);
}

export function configureIcons(options: { defaultSet?: string }): void {
  if (options.defaultSet) {
    defaultSetName = options.defaultSet;
  }
}

export function resolveIcon(
  name: string,
  setName?: string,
): ComponentType<{ className?: string; size?: number }> | null {
  const set = registry.get(setName ?? defaultSetName);
  if (!set) return null;
  return set.resolve(name);
}

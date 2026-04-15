import type { ComponentType } from "react";
import * as LucideIcons from "lucide-react";
import type { IconSet } from "./icon-config.types";

type IconComponent = ComponentType<{ className?: string; size?: number }>;

const registry = new Map<string, IconSet>();
let defaultSetName = "lucide";

function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Fallback resolver: look up any lucide-react icon by its kebab-case name
 * without requiring the consumer to call `registerIcons()` first. Overrides
 * registered via `registerIcons()` still win.
 */
function resolveFromLucide(name: string): IconComponent | null {
  const pascal = kebabToPascal(name);
  const icon = (LucideIcons as unknown as Record<string, IconComponent | undefined>)[pascal];
  return typeof icon === "function" || (icon && typeof icon === "object") ? (icon as IconComponent) : null;
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
): IconComponent | null {
  const resolvedSet = setName ?? defaultSetName;
  const set = registry.get(resolvedSet);
  const registered = set ? set.resolve(name) : null;
  if (registered) return registered;
  if (resolvedSet === "lucide") return resolveFromLucide(name);
  return null;
}

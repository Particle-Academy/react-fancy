import type { ComponentType } from "react";
import * as LucideIcons from "lucide-react";
import type { IconSet } from "./icon-config.types";

const registry = new Map<string, IconSet>();
let defaultSetName = "lucide";

function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const lucideSet: IconSet = {
  resolve: (name: string): ComponentType<{ className?: string; size?: number }> | null => {
    const pascal = kebabToPascal(name);
    const icon = (LucideIcons as Record<string, unknown>)[pascal];
    if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
      return icon as ComponentType<{ className?: string; size?: number }>;
    }
    return null;
  },
};

registry.set("lucide", lucideSet);

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

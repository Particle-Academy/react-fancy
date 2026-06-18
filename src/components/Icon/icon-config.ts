import type { ComponentType } from "react";
import type { IconSet } from "./icon-config.types";

type IconComponent = ComponentType<{ className?: string; size?: number }>;

const registry = new Map<string, IconSet>();
let defaultSetName = "lucide";

/**
 * Addendum layer — icon sets consulted across EVERY lookup, after the active
 * base set but before the lucide auto-fallback, regardless of `defaultSet`.
 * This is how a brand-icon pack (e.g. `@particle-academy/fancy-brand-icons`)
 * layers in: `<Icon name="github" />` resolves the brand mark on top of Lucide
 * (or any swapped base) without a `set=` query. Base set still wins; addenda
 * supplement. Empty by default ⇒ behavior unchanged.
 */
const addenda: IconSet[] = [];

/** Register an icon set as an addendum (supplements every base set). */
export function registerIconAddendum(set: IconSet): void {
  if (!addenda.includes(set)) addenda.push(set);
}

function resolveFromAddenda(name: string): IconComponent | null {
  for (const set of addenda) {
    const hit = set.resolve(name);
    if (hit) return hit as IconComponent;
  }
  return null;
}

function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Lazy lucide barrel. The auto-fallback (`<Icon name="…" />` resolving ANY
 * lucide icon by kebab name) needs the whole namespace because names are
 * dynamic — un-tree-shakeable. Importing it eagerly forced all ~5400 icons
 * into react-fancy's main bundle for every consumer (~548KB). Instead we
 * dynamic-import it on first auto-resolve, so the barrel becomes a lazy chunk
 * loaded ONLY by apps that actually use `<Icon name>` with an unregistered
 * icon — never on the critical path. Consumers wanting sync resolution +
 * tree-shaking should `registerIcons({ ...named imports })` (those win and
 * never trigger the lazy load).
 */
let lucideModule: Record<string, IconComponent | undefined> | null = null;
let lucidePromise: Promise<unknown> | null = null;
let lucideVersion = 0;
const lucideListeners = new Set<() => void>();

function ensureLucideLoaded(): void {
  if (lucideModule || lucidePromise) return;
  lucidePromise = import("lucide-react")
    .then((mod) => {
      lucideModule = mod as unknown as Record<string, IconComponent | undefined>;
      lucideVersion++;
      for (const listener of lucideListeners) listener();
    })
    .catch(() => {
      // Leave lucidePromise set so we don't hammer a failed import.
    });
}

/** Subscribe to the lazy lucide load so `<Icon>` can re-render once it lands. */
export function subscribeIconResolution(listener: () => void): () => void {
  lucideListeners.add(listener);
  return () => lucideListeners.delete(listener);
}

/** Snapshot for useSyncExternalStore — bumps when the lucide barrel loads. */
export function getIconResolutionVersion(): number {
  return lucideVersion;
}

/**
 * Fallback resolver: look up any lucide-react icon by its kebab-case name
 * without requiring the consumer to call `registerIcons()` first. Returns null
 * until the lazy barrel has loaded (the first call kicks off the import; `<Icon>`
 * re-renders via `subscribeIconResolution` when it's ready). Overrides
 * registered via `registerIcons()` still win and resolve synchronously.
 */
function resolveFromLucide(name: string): IconComponent | null {
  // SSR-deterministic: never resolve the lazily-imported lucide barrel on the
  // server. A long-running SSR process (e.g. Inertia's node SSR daemon) loads
  // the barrel after its first request, then renders auto-fallback lucide icons
  // that a fresh client (barrel not yet loaded) does NOT have at hydration →
  // React #418 ("server HTML didn't match"). Returning null on the server makes
  // the server render match the client's FIRST render; the icon then appears
  // once the client loads the barrel (via subscribeIconResolution). Registered
  // icons + addenda (brand packs) still resolve synchronously on both sides.
  if (typeof window === "undefined") return null;
  if (!lucideModule) {
    ensureLucideLoaded();
    return null;
  }
  const pascal = kebabToPascal(name);
  const icon = lucideModule[pascal];
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
  // Addenda fill gaps after the base set, before the lucide auto-fallback — so a
  // brand pack's `github` wins over lucide's auto-resolved one.
  const fromAddenda = resolveFromAddenda(name);
  if (fromAddenda) return fromAddenda;
  if (resolvedSet === "lucide") return resolveFromLucide(name);
  return null;
}

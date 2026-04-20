# Icon

An icon container that resolves icon names from registered icon sets (Lucide by default).

## Import

```tsx
import {
  Icon,
  registerIcons,
  registerIconSet,
  configureIcons,
} from "@particle-academy/react-fancy";
import type { IconSet } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Icon name="rocket" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| name | `string` | - | Icon name to resolve from the registered icon set (e.g., `"rocket"`, `"arrow-right"`) |
| size | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Icon container size. Maps to: xs=12px, sm=16px, md=20px, lg=24px, xl=32px |
| iconSet | `string` | - | Which registered icon set to use (defaults to the configured default) |

Also extends all native `<span>` HTML attributes. When `children` are provided, they render instead of the resolved icon.

## Lucide Icons (zero setup)

All [Lucide](https://lucide.dev) icons work out of the box with kebab-case names. No registration required.

```tsx
<Icon name="rocket" />
<Icon name="arrow-right" size="lg" />
<Icon name="trash-2" />
```

The package auto-resolves any Lucide icon name at runtime via a namespace fallback. This bundles all Lucide icons (~100 KB gzipped). If bundle size is critical, use `registerIcons` to opt into tree-shaking instead (see below).

## Advanced Icon Configuration

Three APIs configure icons: `registerIcons` for tree-shakeable subsets, `registerIconSet` for custom icon libraries, and `configureIcons` for choosing the default set.

### registerIcons (tree-shaking)

Register specific Lucide icons to override the auto-resolve fallback. Registered icons take precedence; unregistered names still fall back to the full Lucide set.

For tree-shaking (if you want to exclude the full Lucide bundle), set up a custom icon set via `registerIconSet` instead.

```tsx
import { registerIcons } from "@particle-academy/react-fancy";
import { Home, Settings, Mail } from "lucide-react";

registerIcons({ Home, Settings, Mail });
```

### registerIconSet

Register a complete custom icon set by name.

```tsx
import { registerIconSet } from "@particle-academy/react-fancy";

registerIconSet("custom", {
  resolve: (name) => MyCustomIconMap[name] ?? null,
});
```

The `IconSet` interface requires a single `resolve` method:

```ts
interface IconSet {
  resolve: (name: string) => ComponentType<{ className?: string; size?: number }> | null;
}
```

### configureIcons

Set the default icon set used when `iconSet` is not specified on `<Icon>`.

```tsx
import { configureIcons } from "@particle-academy/react-fancy";

configureIcons({ defaultSet: "custom" });
```

The built-in default is `"lucide"`, which resolves kebab-case names (e.g., `"arrow-right"`) to Lucide React icons.

## Examples

### Different sizes

```tsx
<Icon name="star" size="xs" />
<Icon name="star" size="md" />
<Icon name="star" size="xl" />
```

### Using a specific icon set

```tsx
<Icon name="home" iconSet="custom" size="lg" />
```

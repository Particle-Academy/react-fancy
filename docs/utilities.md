# Utilities

Shared utility functions and types.

## Import

```tsx
import { cn } from "@particle-academy/react-fancy";
```

---

## cn()

Merges class names using `clsx` + `tailwind-merge`. Handles conditional classes and deduplicates conflicting Tailwind utilities.

```tsx
cn("px-4 py-2", isActive && "bg-blue-500", className);
// => "px-4 py-2 bg-blue-500"

cn("px-4 text-sm", "px-6");
// => "px-6 text-sm" (tailwind-merge resolves px conflict)
```

**Signature:**

```ts
function cn(...inputs: ClassValue[]): string;
```

Accepts strings, objects, arrays, `undefined`, `null`, and `false` -- anything `clsx` supports.

---

## Shared Types

### Size

```ts
type Size = "xs" | "sm" | "md" | "lg" | "xl";
```

### Color

```ts
type Color =
  | "zinc" | "red" | "orange" | "amber" | "yellow" | "lime"
  | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue"
  | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose";
```

### Variant

```ts
type Variant = "solid" | "outline" | "ghost" | "soft";
```

### ButtonColor

Standalone color accepted by `Button` and friends — an alias of `Color` (the
full palette above). `ActionColor` remains as a deprecated alias.

```ts
type ButtonColor = Color;
```

### Placement

Used by Popover, Dropdown, and `useFloatingPosition`.

```ts
type Placement =
  | "top" | "bottom" | "left" | "right"
  | "top-start" | "top-end" | "bottom-start" | "bottom-end";
```

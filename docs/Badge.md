# Badge

An inline badge/tag component with color, variant, and optional dot indicator.

## Import

```tsx
import { Badge } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Badge>Default</Badge>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| color | `"zinc" \| "red" \| "blue" \| "green" \| "amber" \| "violet" \| "rose"` | `"zinc"` | Badge color |
| variant | `"solid" \| "outline" \| "soft"` | `"soft"` | Visual variant |
| size | `"sm" \| "md" \| "lg"` | `"md"` | Badge size |
| dot | `boolean` | `false` | Show a small dot indicator before text |

Also extends all native `<span>` HTML attributes.

## Examples

### Status badge with dot

```tsx
<Badge color="green" dot>Active</Badge>
```

### Solid colored badge

```tsx
<Badge color="red" variant="solid" size="sm">
  3 errors
</Badge>
```

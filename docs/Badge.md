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
| color | `Color` | `"zinc"` | Any color in the full Tailwind v4 palette — the 5 grays (`slate`, `gray`, `zinc`, `neutral`, `stone`) + every hue (`red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`). |
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

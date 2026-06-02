# Progress

A progress indicator available as a horizontal bar or circular ring, with optional percentage display.

## Import

```tsx
import { Progress } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Progress value={60} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `number` | `0` | Current progress value |
| max | `number` | `100` | Maximum value |
| variant | `"bar" \| "circular"` | `"bar"` | Visual variant |
| size | `"sm" \| "md" \| "lg"` | `"md"` | Component size |
| color | `Color` | `"blue"` | Progress color — the full Tailwind v4 palette — 5 grays (`slate`, `gray`, `zinc`, `neutral`, `stone`) + every hue (`red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`). |
| indeterminate | `boolean` | `false` | Show indeterminate/loading animation |
| showValue | `boolean` | `false` | Display percentage text |
| className | `string` | - | Additional CSS classes |

## Examples

### Bar with percentage

```tsx
<Progress value={75} showValue color="green" />
```

### Circular indeterminate

```tsx
<Progress variant="circular" indeterminate size="lg" color="violet" />
```

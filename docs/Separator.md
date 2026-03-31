# Separator

A horizontal or vertical divider line with optional centered label text.

## Import

```tsx
import { Separator } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Separator />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| orientation | `"horizontal" \| "vertical"` | `"horizontal"` | Separator direction |
| label | `string` | - | Optional centered label text (horizontal only) |
| className | `string` | - | Additional CSS classes |

## Examples

### Horizontal with label

```tsx
<Separator label="or" />
```

### Vertical separator

```tsx
<div className="flex h-8 items-center gap-4">
  <span>Left</span>
  <Separator orientation="vertical" />
  <span>Right</span>
</div>
```

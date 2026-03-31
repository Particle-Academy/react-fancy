# Skeleton

An animated placeholder component for loading states, available as rectangle, circle, or text line shapes.

## Import

```tsx
import { Skeleton } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Skeleton width={200} height={20} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| shape | `"rect" \| "circle" \| "text"` | `"rect"` | Shape of the skeleton placeholder |
| width | `string \| number` | - | Custom width (CSS value or number in px) |
| height | `string \| number` | - | Custom height (CSS value or number in px) |
| className | `string` | - | Additional CSS classes |

Shape defaults: `"rect"` renders with rounded-lg corners; `"circle"` renders as a rounded-full with 1:1 aspect ratio; `"text"` renders as a full-width line at 16px height.

## Examples

### Loading card placeholder

```tsx
<div className="space-y-3">
  <Skeleton shape="circle" width={48} height={48} />
  <Skeleton shape="text" />
  <Skeleton shape="text" width="60%" />
</div>
```

### Custom rectangle

```tsx
<Skeleton width={300} height={180} />
```

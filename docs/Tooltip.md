# Tooltip

A tooltip that appears on hover/focus around a trigger element, rendered via Portal for correct stacking.

## Import

```tsx
import { Tooltip } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Tooltip content="Save changes">
  <button>Save</button>
</Tooltip>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactElement` | **required** | Trigger element (must accept ref, onMouseEnter, onMouseLeave, onFocus, onBlur) |
| content | `ReactNode` | **required** | Tooltip content |
| placement | `Placement` | `"top"` | Position relative to trigger. One of: `"top"`, `"bottom"`, `"left"`, `"right"`, `"top-start"`, `"top-end"`, `"bottom-start"`, `"bottom-end"` |
| delay | `number` | `200` | Delay in ms before showing |
| offset | `number` | `8` | Distance in px from the trigger |
| className | `string` | - | Additional CSS classes for the tooltip |

## Examples

### Bottom placement with longer delay

```tsx
<Tooltip content="Delete this item" placement="bottom" delay={500}>
  <button>Delete</button>
</Tooltip>
```

### Rich content

```tsx
<Tooltip content={<span>Press <kbd>Ctrl+S</kbd> to save</span>}>
  <button>Save</button>
</Tooltip>
```

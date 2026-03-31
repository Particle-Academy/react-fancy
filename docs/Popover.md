# Popover

A floating content panel anchored to a trigger element. Supports click and hover activation with configurable placement.

## Import

```tsx
import { Popover } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Popover>
  <Popover.Trigger>
    <button>Open popover</button>
  </Popover.Trigger>
  <Popover.Content>
    <p>Popover content here</p>
  </Popover.Content>
</Popover>
```

## Props

### Popover (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | `boolean` | - | Controlled open state |
| defaultOpen | `boolean` | `false` | Default open state (uncontrolled) |
| onOpenChange | `(open: boolean) => void` | - | Callback when open state changes |
| placement | `Placement` | `"bottom"` | Position relative to trigger. One of: `"top"`, `"bottom"`, `"left"`, `"right"`, `"top-start"`, `"top-end"`, `"bottom-start"`, `"bottom-end"` |
| offset | `number` | `8` | Pixel offset from the trigger |
| hover | `boolean` | `false` | Open on hover instead of click |
| hoverDelay | `number` | `200` | Delay in ms before opening on hover |
| hoverCloseDelay | `number` | `300` | Delay in ms before closing after hover leaves |

### Popover.Trigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Trigger element |
| className | `string` | - | Additional CSS classes |

### Popover.Content

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Content to display |
| className | `string` | - | Additional CSS classes |

## Hover Mode

The `hover` prop switches from click-to-toggle to hover-to-open behavior. When enabled, the popover opens after `hoverDelay` ms and closes after `hoverCloseDelay` ms once the cursor leaves both the trigger and content. Moving from the trigger into the content keeps the popover open.

```tsx
<Popover hover hoverDelay={100} hoverCloseDelay={400}>
  <Popover.Trigger>
    <button>Hover me</button>
  </Popover.Trigger>
  <Popover.Content>
    <p>Tooltip-like popover</p>
  </Popover.Content>
</Popover>
```

## Controlled Example

```tsx
const [open, setOpen] = useState(false);

<Popover open={open} onOpenChange={setOpen} placement="right">
  <Popover.Trigger>
    <button>Info</button>
  </Popover.Trigger>
  <Popover.Content className="p-4 w-64">
    <h3>Details</h3>
    <p>Some additional information.</p>
  </Popover.Content>
</Popover>
```

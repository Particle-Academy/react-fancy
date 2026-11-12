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
| placement | `Placement` | `"bottom"` | Position relative to trigger. One of: `"top"`, `"bottom"`, `"left"`, `"right"`, `"top-start"`, `"top-end"`, `"bottom-start"`, `"bottom-end"`. `-start` / `-end` follow the trigger's writing direction (`bottom-start` lines up with its right edge under `dir="rtl"`); `left` / `right` are physical |
| offset | `number` | `8` | Pixel offset from the trigger |
| hover | `boolean` | `false` | Open on hover instead of click |
| hoverDelay | `number` | `200` | Delay in ms before opening on hover |
| hoverCloseDelay | `number` | `300` | Delay in ms before closing after hover leaves |
| haspopup | `"dialog" \| "menu" \| "listbox" \| "tree" \| "grid"` | `"dialog"` | The trigger's `aria-haspopup`: what a screen reader announces the panel as. Pass `"menu"` when the content is a menu. Not set with `hover` |

### Popover.Trigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Trigger element |
| className | `string` | - | Additional CSS classes, joined onto the child's |

The trigger renders no element of its own around an element child. It merges onto that child (keeping the child's own props, handlers and ref): `aria-haspopup`, `aria-expanded`, `aria-controls` (the content's id, or the `id` you gave `Popover.Content`, while it is open) and the `data-react-fancy-popover-trigger` handle. Other attributes passed to `Popover.Trigger` fill only what the child leaves unset. A component child must forward its props and ref to the element it renders. A focusable `<span tabIndex={0}>` also gets `role="button"` and opens on Enter / Space. A child nothing can focus, such as plain text, is wrapped in a `<button type="button">` that carries the ARIA.

With `hover`, activation does not open the popover, so the trigger sets no popup ARIA at all. An element child is not wrapped; a text child is wrapped in a `<span>` with no ARIA.

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

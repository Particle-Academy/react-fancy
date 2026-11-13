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
| children | `ReactElement` | **required** | Trigger element (must accept ref, onMouseEnter, onMouseLeave, onFocus, onBlur, aria-describedby). While the tooltip is shown, its `aria-describedby` names the `role="tooltip"` element, added to any description it already names |
| content | `ReactNode` | **required** | Tooltip content |
| placement | `Placement` | `"top"` | Position relative to trigger. One of: `"top"`, `"bottom"`, `"left"`, `"right"`, `"top-start"`, `"top-end"`, `"bottom-start"`, `"bottom-end"` |
| delay | `number` | `200` | Delay in ms before showing |
| offset | `number` | `8` | Distance in px from the trigger |
| className | `string` | - | Additional CSS classes for the tooltip **bubble**, not the trigger |
| triggerClassName | `string` | - | Classes for the child (the trigger element), joined in front of its own `className` |
| describe | `boolean` | `true` | Name the tooltip in the trigger's `aria-describedby` while shown. Turn off only when the tooltip repeats words already in the trigger's accessible name |
| ...rest | attributes and handlers | - | Forwarded to the child, with the `ref`. The child's own value wins on a clash; handlers run both, the child's first. `className` is not forwarded (it styles the bubble) |

## Inside a Dropdown or Popover trigger

`Dropdown.Trigger` and `Popover.Trigger` merge their click and key handlers,
popup ARIA, stable handle and ref onto their child. A Tooltip passes all of
them on to its own child, so it can sit between the trigger and the button:

```tsx
<Dropdown>
  <Dropdown.Trigger>
    <Tooltip content="More actions">
      <Button icon="ellipsis" aria-label="Options" />
    </Tooltip>
  </Dropdown.Trigger>
  <Dropdown.Items>…</Dropdown.Items>
</Dropdown>
```

The button carries `aria-haspopup`, `aria-expanded` and the trigger handle,
opens the menu, and is still described by the tooltip while it is shown.

A `className` on the trigger reaches the **button**, not the bubble: the
trigger passes it to the Tooltip's `triggerClassName`, because the Tooltip's own
`className` styles the bubble. So
`<Popover.Trigger className="[-webkit-app-region:no-drag]">` around a Tooltip
keeps the button clickable inside a title-bar drag region.

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

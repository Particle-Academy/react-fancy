# Dropdown

A click-triggered dropdown menu with keyboard navigation, floating positioning, and item states.

## Import

```tsx
import { Dropdown } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Dropdown>
  <Dropdown.Trigger>
    <button>Options</button>
  </Dropdown.Trigger>
  <Dropdown.Items>
    <Dropdown.Item onClick={() => console.log("edit")}>Edit</Dropdown.Item>
    <Dropdown.Item onClick={() => console.log("copy")}>Copy</Dropdown.Item>
    <Dropdown.Separator />
    <Dropdown.Item danger onClick={() => console.log("delete")}>Delete</Dropdown.Item>
  </Dropdown.Items>
</Dropdown>
```

## Props

### Dropdown (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| placement | `Placement` | `"bottom-start"` | Position relative to trigger. `-start` / `-end` follow the trigger's writing direction, so the default lines up with the trigger's right edge under `dir="rtl"` |
| offset | `number` | `4` | Pixel offset from the trigger |

### Dropdown.Trigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Trigger element |
| className | `string` | - | Additional CSS classes, joined onto the child's. With a `Tooltip` child they reach the element the Tooltip wraps, not the bubble |
| ...rest | attributes | - | Fill only what the child leaves unset |

**Which element `className` reaches.** The trigger's own `<button>` when it wraps (text, a non-focusable child); otherwise the child. With a `Tooltip` child, the trigger passes it to the Tooltip's `triggerClassName`, so it lands on the button inside, not the tooltip bubble. Any other component child must apply `className` to the element its ref reaches; if none of the classes end up there, a development build logs a warning.

The trigger renders no element of its own around an element child. It merges onto that child (keeping the child's own props, handlers and ref): `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` (the menu's id, while it is open) and the `data-react-fancy-dropdown-trigger` handle. Pass the focusable control itself, such as a `<Button>` or `<button>`; a component child must forward its props and ref to the element it renders. A focusable `<span tabIndex={0}>` also gets `role="button"`. A child nothing can focus, such as plain text, is wrapped in a `<button type="button">` that carries the ARIA and the handle.

### Dropdown.Items

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Menu items |
| className | `string` | - | Additional CSS classes |

### Dropdown.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item content |
| onClick | `() => void` | - | Click handler |
| disabled | `boolean` | - | Disable the item |
| danger | `boolean` | - | Destructive action styling (red) |
| className | `string` | - | Additional CSS classes |

### Dropdown.Separator

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | - | Additional CSS classes |

## Example with Placement

```tsx
<Dropdown placement="bottom-end" offset={8}>
  <Dropdown.Trigger>
    <button>More actions</button>
  </Dropdown.Trigger>
  <Dropdown.Items>
    <Dropdown.Item onClick={handleRename}>Rename</Dropdown.Item>
    <Dropdown.Item disabled>Archive</Dropdown.Item>
    <Dropdown.Separator />
    <Dropdown.Item danger onClick={handleDelete}>Delete</Dropdown.Item>
  </Dropdown.Items>
</Dropdown>
```

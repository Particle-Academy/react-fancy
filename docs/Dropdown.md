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
| placement | `Placement` | `"bottom-start"` | Position relative to trigger |
| offset | `number` | `4` | Pixel offset from the trigger |

### Dropdown.Trigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Trigger element |

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

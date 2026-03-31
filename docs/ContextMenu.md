# ContextMenu

A right-click context menu that appears at the cursor position. Compound component with Trigger, Content, Item, and Separator.

## Import

```tsx
import { ContextMenu } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<ContextMenu>
  <ContextMenu.Trigger>
    <div className="w-64 h-32 border border-dashed rounded p-4">
      Right-click here
    </div>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item onClick={() => console.log("cut")}>Cut</ContextMenu.Item>
    <ContextMenu.Item onClick={() => console.log("copy")}>Copy</ContextMenu.Item>
    <ContextMenu.Item onClick={() => console.log("paste")}>Paste</ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item danger onClick={() => console.log("delete")}>Delete</ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu>
```

## Props

### ContextMenu (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Trigger and content children |

### ContextMenu.Trigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Area that responds to right-click |
| className | `string` | - | Additional CSS classes |

### ContextMenu.Content

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Menu items |
| className | `string` | - | Additional CSS classes |

### ContextMenu.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item content |
| onClick | `() => void` | - | Click handler |
| disabled | `boolean` | - | Disable the item |
| danger | `boolean` | - | Destructive action styling (red) |
| className | `string` | - | Additional CSS classes |

### ContextMenu.Separator

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | - | Additional CSS classes |

## Example with Disabled Items

```tsx
<ContextMenu>
  <ContextMenu.Trigger>
    <div className="p-6 bg-zinc-100 rounded">Right-click target</div>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item onClick={handleEdit}>Edit</ContextMenu.Item>
    <ContextMenu.Item disabled>Move (unavailable)</ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item danger onClick={handleRemove}>Remove</ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu>
```

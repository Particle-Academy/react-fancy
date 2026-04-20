# ContextMenu

A right-click context menu that appears at the cursor position. Compound component with Trigger, Content, Item, Separator, and nested Sub menus.

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

## Submenus

Nest `ContextMenu.Sub` inside `Content` for multi-level menus. Hover or click the trigger to open.

```tsx
<ContextMenu>
  <ContextMenu.Trigger>
    <div className="p-6 bg-zinc-100 rounded">Right-click for nested menu</div>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item onClick={handleCut}>Cut</ContextMenu.Item>
    <ContextMenu.Item onClick={handleCopy}>Copy</ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger>Share via</ContextMenu.SubTrigger>
      <ContextMenu.SubContent>
        <ContextMenu.Item onClick={() => share("email")}>Email</ContextMenu.Item>
        <ContextMenu.Item onClick={() => share("slack")}>Slack</ContextMenu.Item>
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Social</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            <ContextMenu.Item onClick={() => share("twitter")}>Twitter</ContextMenu.Item>
            <ContextMenu.Item onClick={() => share("linkedin")}>LinkedIn</ContextMenu.Item>
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      </ContextMenu.SubContent>
    </ContextMenu.Sub>
    <ContextMenu.Separator />
    <ContextMenu.Item danger onClick={handleDelete}>Delete</ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu>
```

### ContextMenu.Sub

Container for a submenu. Place inside `Content` or another `SubContent`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | SubTrigger and SubContent |

### ContextMenu.SubTrigger

Looks like a menu item with a chevron. Hover or click to open the submenu.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Trigger label |
| className | `string` | - | Additional CSS classes |

### ContextMenu.SubContent

Nested menu panel. Positioned to the right of the trigger (auto-flips left near screen edge).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Menu items |
| className | `string` | - | Additional CSS classes |

**Behavior:**
- Opens on hover (immediate) or click
- 150ms grace period on mouse leave so the cursor can travel to the submenu
- Nests arbitrarily deep
- Same styling and dark mode support as the parent menu

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

# Menu

A navigation menu supporting horizontal/vertical orientation, nested submenus, grouped items, icons, and badges.

## Import

```tsx
import { Menu } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Menu>
  <Menu.Item href="/" active>Home</Menu.Item>
  <Menu.Item href="/about">About</Menu.Item>
  <Menu.Submenu label="Products" icon={<BoxIcon />}>
    <Menu.Item href="/products/widgets">Widgets</Menu.Item>
    <Menu.Item href="/products/gadgets">Gadgets</Menu.Item>
  </Menu.Submenu>
</Menu>
```

## Props

### Menu (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| orientation | `"horizontal" \| "vertical"` | `"vertical"` | Layout direction |
| className | `string` | - | Additional CSS classes |

### Menu.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item content |
| href | `string` | - | Link URL |
| icon | `ReactNode` | - | Leading icon |
| active | `boolean` | - | Active state highlight |
| disabled | `boolean` | - | Disable the item |
| badge | `ReactNode` | - | Trailing badge element |
| onClick | `() => void` | - | Click handler |
| className | `string` | - | Additional CSS classes |

### Menu.Submenu

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | `ReactNode` | - | Submenu trigger label (required) |
| icon | `ReactNode` | - | Leading icon |
| defaultOpen | `boolean` | - | Whether the submenu starts open |
| className | `string` | - | Additional CSS classes |

### Menu.Group

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Grouped items |
| label | `string` | - | Group heading |
| className | `string` | - | Additional CSS classes |

## Horizontal Menu

```tsx
<Menu orientation="horizontal">
  <Menu.Item href="/" active>Home</Menu.Item>
  <Menu.Item href="/docs">Docs</Menu.Item>
  <Menu.Item href="/pricing" badge={<span>New</span>}>Pricing</Menu.Item>
</Menu>
```

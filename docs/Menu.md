# Menu

A navigation menu supporting horizontal/vertical orientation, nested submenus, grouped items, icons, and badges.

## Import

```tsx
import { Menu } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
import { Menu, Icon } from "@particle-academy/react-fancy";

<Menu>
  <Menu.Item href="/" icon={<Icon name="home" size="sm" />} active>Home</Menu.Item>
  <Menu.Item href="/about" icon={<Icon name="info" size="sm" />}>About</Menu.Item>
  <Menu.Submenu label="Products" icon={<Icon name="box" size="sm" />}>
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
  <Menu.Item href="/" icon={<Icon name="home" size="sm" />} active>Home</Menu.Item>
  <Menu.Item href="/docs" icon={<Icon name="book" size="sm" />}>Docs</Menu.Item>
  <Menu.Item href="/pricing" badge={<Badge size="sm">New</Badge>}>Pricing</Menu.Item>
</Menu>
```

## Grouped Vertical Menu

```tsx
<Menu orientation="vertical">
  <Menu.Group label="Main">
    <Menu.Item icon={<Icon name="home" size="sm" />} active>Dashboard</Menu.Item>
    <Menu.Item icon={<Icon name="mail" size="sm" />} badge={<Badge size="sm">3</Badge>}>Inbox</Menu.Item>
  </Menu.Group>
  <Menu.Group label="Settings">
    <Menu.Submenu label="Configuration" icon={<Icon name="settings" size="sm" />} defaultOpen>
      <Menu.Item>General</Menu.Item>
      <Menu.Item>Security</Menu.Item>
    </Menu.Submenu>
    <Menu.Item icon={<Icon name="palette" size="sm" />} disabled>Theme (coming soon)</Menu.Item>
  </Menu.Group>
</Menu>
```

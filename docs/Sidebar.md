# Sidebar

A collapsible sidebar navigation with icon-only or letter-abbreviated collapsed mode, submenus, groups, and a toggle button.

## Import

```tsx
import { Sidebar } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
import { Sidebar, Icon } from "@particle-academy/react-fancy";

<Sidebar>
  <Sidebar.Item href="/" icon={<Icon name="home" size="sm" />} active>Home</Sidebar.Item>
  <Sidebar.Item href="/settings" icon={<Icon name="settings" size="sm" />}>Settings</Sidebar.Item>
  <Sidebar.Group label="Projects">
    <Sidebar.Item href="/project-a">Project A</Sidebar.Item>
    <Sidebar.Item href="/project-b">Project B</Sidebar.Item>
  </Sidebar.Group>
  <Sidebar.Toggle />
</Sidebar>
```

## Props

### Sidebar (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| collapsed | `boolean` | - | Controlled collapsed state |
| defaultCollapsed | `boolean` | `false` | Default collapsed state (uncontrolled) |
| onCollapsedChange | `(collapsed: boolean) => void` | - | Callback when collapsed state changes |
| collapseMode | `"icons" \| "letters"` | `"icons"` | How items display when collapsed: icons only, or first 3 letters |
| className | `string` | - | Additional CSS classes |

### Sidebar.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item label |
| href | `string` | - | Link URL |
| icon | `ReactNode` | - | Leading icon |
| active | `boolean` | - | Active state highlight |
| disabled | `boolean` | - | Disable the item |
| badge | `ReactNode` | - | Trailing badge element |
| onClick | `() => void` | - | Click handler |
| className | `string` | - | Additional CSS classes |

### Sidebar.Group

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Grouped items |
| label | `string` | - | Group heading |
| className | `string` | - | Additional CSS classes |

### Sidebar.Submenu

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Submenu items |
| label | `string` | - | Submenu trigger label (required) |
| icon | `ReactNode` | - | Leading icon |
| defaultOpen | `boolean` | - | Whether the submenu starts open |
| className | `string` | - | Additional CSS classes |

### Sidebar.Toggle

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | - | Additional CSS classes |

## Collapsible Sidebar

```tsx
const [collapsed, setCollapsed] = useState(false);

<Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} collapseMode="icons">
  <Sidebar.Item icon={<Icon name="home" size="sm" />}>Dashboard</Sidebar.Item>
  <Sidebar.Item icon={<Icon name="users" size="sm" />}>Users</Sidebar.Item>
  <Sidebar.Submenu label="Reports" icon={<Icon name="bar-chart-3" size="sm" />} defaultOpen>
    <Sidebar.Item>Monthly</Sidebar.Item>
    <Sidebar.Item>Yearly</Sidebar.Item>
  </Sidebar.Submenu>
  <Sidebar.Toggle />
</Sidebar>
```

### collapseMode

- `"icons"` (default) — only the icon is shown when collapsed; falls back to the first 3 letters if no icon is provided
- `"letters"` — the first 3 letters of the label are always shown

## useSidebar Hook

Access collapsed state from any child component:

```tsx
import { useSidebar } from "@particle-academy/react-fancy";

function CollapseAware() {
  const { collapsed, setCollapsed } = useSidebar();
  return <button onClick={() => setCollapsed(!collapsed)}>Toggle</button>;
}
```

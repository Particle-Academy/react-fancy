# Tabs

A tabbed interface with three visual variants, controlled and uncontrolled modes, and linked tab-panel pairs.

## Import

```tsx
import { Tabs } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Tabs defaultTab="general">
  <Tabs.List>
    <Tabs.Tab value="general">General</Tabs.Tab>
    <Tabs.Tab value="security">Security</Tabs.Tab>
    <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panels>
    <Tabs.Panel value="general">General settings content</Tabs.Panel>
    <Tabs.Panel value="security">Security settings content</Tabs.Panel>
    <Tabs.Panel value="notifications">Notification preferences</Tabs.Panel>
  </Tabs.Panels>
</Tabs>
```

## Props

### Tabs (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| defaultTab | `string` | `""` | Initially active tab value (uncontrolled) |
| activeTab | `string` | - | Controlled active tab value |
| onTabChange | `(tab: string) => void` | - | Callback when the active tab changes |
| variant | `"underline" \| "pills" \| "boxed"` | `"underline"` | Visual style |
| className | `string` | - | Additional CSS classes |

### Tabs.List

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Tab elements |
| className | `string` | - | Additional CSS classes |

### Tabs.Tab

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | - | Unique tab identifier (required) |
| disabled | `boolean` | - | Disable this tab |
| className | `string` | - | Additional CSS classes |

### Tabs.Panels

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Panel elements |
| className | `string` | - | Additional CSS classes |

### Tabs.Panel

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | - | Tab value this panel corresponds to (required) |
| className | `string` | - | Additional CSS classes |

## Controlled with Pills Variant

```tsx
const [tab, setTab] = useState("overview");

<Tabs activeTab={tab} onTabChange={setTab} variant="pills">
  <Tabs.List>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
    <Tabs.Tab value="reports" disabled>Reports</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panels>
    <Tabs.Panel value="overview">Overview content</Tabs.Panel>
    <Tabs.Panel value="analytics">Analytics content</Tabs.Panel>
  </Tabs.Panels>
</Tabs>
```

# MobileMenu

Mobile navigation components with two variants: a slide-out flyout panel and a fixed bottom tab bar.

## Import

```tsx
import { MobileMenu } from "@particle-academy/react-fancy";
```

## Import

```tsx
import { MobileMenu, Icon } from "@particle-academy/react-fancy";
```

## Flyout

A slide-out panel from the left or right edge.

```tsx
const [open, setOpen] = useState(false);

<button onClick={() => setOpen(true)}>Menu</button>

<MobileMenu.Flyout open={open} onClose={() => setOpen(false)} side="left" title="Menu">
  <MobileMenu.Item href="/" icon={<Icon name="home" />} active>Home</MobileMenu.Item>
  <MobileMenu.Item href="/about" icon={<Icon name="info" />}>About</MobileMenu.Item>
  <MobileMenu.Item href="/contact" icon={<Icon name="mail" />}>Contact</MobileMenu.Item>
</MobileMenu.Flyout>
```

## Bottom Bar

A fixed bottom navigation bar for mobile.

```tsx
<MobileMenu.BottomBar>
  <MobileMenu.Item href="/" icon={<Icon name="home" />} active>Home</MobileMenu.Item>
  <MobileMenu.Item href="/search" icon={<Icon name="search" />}>Search</MobileMenu.Item>
  <MobileMenu.Item href="/profile" icon={<Icon name="user" />}>Profile</MobileMenu.Item>
</MobileMenu.BottomBar>
```

## Props

### MobileMenu.Flyout

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | `boolean` | - | Whether the flyout is visible (required) |
| onClose | `() => void` | - | Callback to close the flyout (required) |
| side | `"left" \| "right"` | - | Which edge the panel slides from |
| title | `string` | - | Optional header title |
| className | `string` | - | Additional CSS classes |

### MobileMenu.BottomBar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Menu items |
| className | `string` | - | Additional CSS classes |

### MobileMenu.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item label |
| href | `string` | - | Link URL |
| icon | `ReactNode` | - | Icon element |
| active | `boolean` | - | Active state highlight |
| disabled | `boolean` | - | Disable the item |
| badge | `ReactNode` | - | Badge element |
| onClick | `() => void` | - | Click handler |
| className | `string` | - | Additional CSS classes |

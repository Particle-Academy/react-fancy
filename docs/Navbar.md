# Navbar

A top navigation bar with brand slot, navigation items, and a mobile hamburger toggle.

## Import

```tsx
import { Navbar } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Navbar>
  <Navbar.Brand>
    <a href="/">MyApp</a>
  </Navbar.Brand>
  <Navbar.Items>
    <Navbar.Item href="/" active>Home</Navbar.Item>
    <Navbar.Item href="/about">About</Navbar.Item>
    <Navbar.Item href="/contact">Contact</Navbar.Item>
  </Navbar.Items>
  <Navbar.Toggle />
</Navbar>
```

## Props

### Navbar (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Brand, items, toggle children |
| className | `string` | - | Additional CSS classes |

### Navbar.Brand

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Logo or brand element |
| className | `string` | - | Additional CSS classes |

### Navbar.Items

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Navigation items |
| className | `string` | - | Additional CSS classes |

### Navbar.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item content |
| href | `string` | - | Link URL |
| active | `boolean` | - | Active/current page indicator |
| className | `string` | - | Additional CSS classes |

### Navbar.Toggle

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | - | Additional CSS classes |

The Navbar manages a `mobileOpen` state internally. `Navbar.Toggle` toggles the mobile navigation drawer, and `Navbar.Items` responds to that state.

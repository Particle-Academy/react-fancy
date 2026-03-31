# Breadcrumbs

A navigation trail with configurable separators, a shrinkable mode that collapses intermediate items to "...", and an automatic mobile dropdown.

## Import

```tsx
import { Breadcrumbs } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Breadcrumbs>
  <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/products">Products</Breadcrumbs.Item>
  <Breadcrumbs.Item active>Widget</Breadcrumbs.Item>
</Breadcrumbs>
```

## Props

### Breadcrumbs (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| separator | `ReactNode` | `<ChevronRight />` | Custom separator element between items |
| shrink | `boolean` | - | Collapse intermediate items to "..." (expand on hover/click) |
| className | `string` | - | Additional CSS classes |

### Breadcrumbs.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item label |
| href | `string` | - | Link URL (renders an anchor when provided) |
| active | `boolean` | - | Mark as the current page (no link) |
| className | `string` | - | Additional CSS classes |

## Shrinkable Breadcrumbs

When `shrink` is enabled, only the "..." button and the last item are shown. Hovering or clicking "..." expands the full trail.

```tsx
<Breadcrumbs shrink>
  <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/docs">Docs</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/docs/components">Components</Breadcrumbs.Item>
  <Breadcrumbs.Item active>Breadcrumbs</Breadcrumbs.Item>
</Breadcrumbs>
```

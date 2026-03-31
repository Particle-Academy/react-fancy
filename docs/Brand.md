# Brand

A branding component that displays a logo, name, and tagline side by side.

## Import

```tsx
import { Brand } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Brand name="Acme Inc." />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| logo | `ReactNode` | - | Logo element (image, icon, SVG, etc.) |
| name | `string` | - | Brand name text |
| tagline | `string` | - | Tagline or subtitle text |
| size | `"sm" \| "md" \| "lg"` | `"md"` | Overall size |
| className | `string` | - | Additional CSS classes |

## Examples

### Full brand with logo

```tsx
<Brand
  logo={<img src="/logo.svg" alt="" className="h-8 w-8" />}
  name="Acme Inc."
  tagline="Build amazing things"
  size="lg"
/>
```

### Name only

```tsx
<Brand name="My App" size="sm" />
```

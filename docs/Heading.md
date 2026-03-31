# Heading

A heading component that renders semantic heading elements with configurable size and weight.

## Import

```tsx
import { Heading } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Heading>Page Title</Heading>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| as | `"h1" \| "h2" \| "h3" \| "h4" \| "h5" \| "h6"` | `"h2"` | Which heading element to render |
| size | `"xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl"` | `"lg"` | Text size |
| weight | `"normal" \| "medium" \| "semibold" \| "bold"` | `"bold"` | Font weight |

Also extends all native `<h1>`-`<h6>` HTML attributes.

## Examples

### Page title

```tsx
<Heading as="h1" size="2xl">
  Welcome
</Heading>
```

### Section heading

```tsx
<Heading as="h3" size="md" weight="semibold">
  Settings
</Heading>
```

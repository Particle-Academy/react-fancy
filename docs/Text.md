# Text

A text component for rendering paragraphs, spans, or labels with preset sizes, weights, and colors.

## Import

```tsx
import { Text } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Text>Hello, world!</Text>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| as | `"p" \| "span" \| "div" \| "label"` | `"p"` | Which element to render |
| size | `"xs" \| "sm" \| "md" \| "lg"` | `"md"` | Text size |
| weight | `"normal" \| "medium" \| "semibold" \| "bold"` | `"normal"` | Font weight |
| color | `"default" \| "muted" \| "accent" \| "danger" \| "success"` | `"default"` | Text color preset |

Also extends all native HTML attributes for the rendered element.

## Examples

### Muted helper text

```tsx
<Text size="sm" color="muted">
  This action cannot be undone.
</Text>
```

### Inline accent text

```tsx
<Text as="span" color="accent" weight="semibold">
  New
</Text>
```

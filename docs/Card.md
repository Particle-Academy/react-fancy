# Card

A container component with optional header, body, and footer sections. Uses `Object.assign` to expose compound sub-components.

## Import

```tsx
import { Card } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Card>
  <Card.Body>Content goes here</Card.Body>
</Card>
```

## Card Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `"outlined" \| "elevated" \| "flat"` | `"outlined"` | Visual variant |
| padding | `"none" \| "sm" \| "md" \| "lg"` | `"md"` | Padding applied to child sections |

Also extends all native `<div>` HTML attributes.

## Sub-Components

### Card.Header

Renders a section with a bottom border. Accepts all `<div>` HTML attributes.

### Card.Body

Renders a plain content section. Accepts all `<div>` HTML attributes.

### Card.Footer

Renders a section with a top border. Accepts all `<div>` HTML attributes.

## Examples

### Full card with sections

```tsx
<Card variant="elevated" padding="lg">
  <Card.Header>
    <h3 className="font-semibold">Settings</h3>
  </Card.Header>
  <Card.Body>
    <p>Configure your preferences below.</p>
  </Card.Body>
  <Card.Footer>
    <button>Save</button>
  </Card.Footer>
</Card>
```

### Flat card without header

```tsx
<Card variant="flat">
  <Card.Body>
    <p>A simple flat card.</p>
  </Card.Body>
</Card>
```

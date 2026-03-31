# Callout

A colored alert/callout box with optional icon and dismiss button.

## Import

```tsx
import { Callout } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Callout>This is an informational callout.</Callout>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | **required** | Callout content |
| color | `"blue" \| "green" \| "amber" \| "red" \| "zinc"` | `"blue"` | Callout color theme |
| icon | `ReactNode` | - | Icon element displayed on the left |
| dismissible | `boolean` | `false` | Show a dismiss/close button |
| onDismiss | `() => void` | - | Callback when dismiss button is clicked |
| className | `string` | - | Additional CSS classes |

## Examples

### Warning callout with icon

```tsx
import { AlertTriangle } from "lucide-react";

<Callout color="amber" icon={<AlertTriangle size={20} />}>
  Your trial expires in 3 days.
</Callout>
```

### Dismissible error callout

```tsx
<Callout color="red" dismissible onDismiss={() => setVisible(false)}>
  Something went wrong. Please try again.
</Callout>
```

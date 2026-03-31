# Portal

Renders children into a DOM node outside the React component tree using `createPortal`, with automatic dark mode propagation.

## Import

```tsx
import { Portal } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Portal>
  <div className="fixed inset-0 z-50 bg-black/50">Modal overlay</div>
</Portal>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | **required** | Content to render in the portal |
| container | `HTMLElement` | `document.body` | Target DOM element to portal into |

Portal wraps children in a `<div style="display: contents">` that automatically syncs the `dark` class from `<html>`, ensuring Tailwind `dark:` utilities work correctly inside portals.

Returns `null` during SSR (when `document` is undefined).

## Examples

### Custom container

```tsx
const container = document.getElementById("modal-root")!;

<Portal container={container}>
  <div>Rendered inside #modal-root</div>
</Portal>
```

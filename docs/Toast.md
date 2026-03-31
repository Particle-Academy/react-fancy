# Toast

A notification system with timed auto-dismiss, multiple variants, and configurable screen position. Uses a provider + hook pattern.

## Import

```tsx
import { Toast, useToast } from "@particle-academy/react-fancy";
```

## Setup

Wrap your app with `Toast.Provider`:

```tsx
<Toast.Provider position="bottom-right" maxToasts={5}>
  <App />
</Toast.Provider>
```

## Basic Usage

```tsx
function MyComponent() {
  const { toast, dismiss } = useToast();

  return (
    <button
      onClick={() =>
        toast({
          title: "Saved",
          description: "Your changes have been saved.",
          variant: "success",
          duration: 4000,
        })
      }
    >
      Save
    </button>
  );
}
```

## Props

### Toast.Provider

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| position | `"top-right" \| "top-left" \| "bottom-right" \| "bottom-left"` | `"bottom-right"` | Screen corner for toast stack |
| maxToasts | `number` | `5` | Maximum visible toasts (oldest removed first) |

### useToast() return value

| Property | Type | Description |
|----------|------|-------------|
| toasts | `ToastData[]` | Current list of active toasts |
| toast | `(data: Omit<ToastData, "id">) => string` | Show a toast, returns its id |
| dismiss | `(id: string) => void` | Manually dismiss a toast by id |

### ToastData

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| title | `string` | - | Toast title (required) |
| description | `string` | - | Optional description text |
| variant | `"default" \| "success" \| "error" \| "warning" \| "info"` | `"default"` | Visual variant |
| duration | `number` | - | Auto-dismiss duration in ms |

## Example with Variants

```tsx
const { toast } = useToast();

toast({ title: "Info", variant: "info" });
toast({ title: "Success!", variant: "success", description: "Item created." });
toast({ title: "Error", variant: "error", description: "Something went wrong." });
toast({ title: "Warning", variant: "warning", duration: 6000 });
```

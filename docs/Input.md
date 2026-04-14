# Input

Text input with built-in label, error, prefix/suffix, and leading/trailing icon support.

## Import

```tsx
import { Input } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Input label="Email" type="email" placeholder="you@example.com" />
```

## Props

Extends all native `<input>` attributes (except `size`, `type`, `prefix`).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `"text" \| "email" \| "password" \| "number" \| "tel" \| "url" \| "search"` | `"text"` | Input type |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Controls input height and text size |
| `label` | `string` | - | Wraps input in a `Field` with this label |
| `description` | `string` | - | Helper text below the input |
| `error` | `string` | - | Error message (red text below input, red border) |
| `required` | `boolean` | `false` | Red asterisk on label, sets native `required` |
| `dirty` | `boolean` | `false` | Amber ring to indicate unsaved changes |
| `disabled` | `boolean` | `false` | Disables the input |
| `leading` | `ReactNode` | - | Icon/element positioned inside the input on the left |
| `trailing` | `ReactNode` | - | Icon/element positioned inside the input on the right |
| `prefix` | `ReactNode` | - | Affix rendered before the input |
| `suffix` | `ReactNode` | - | Affix rendered after the input |
| `prefixPosition` | `"inside" \| "outside"` | - | Whether prefix renders inside or outside the input border |
| `suffixPosition` | `"inside" \| "outside"` | - | Whether suffix renders inside or outside the input border |
| `onValueChange` | `(value: string) => void` | - | Convenience callback with the string value directly |
| `className` | `string` | - | Additional CSS classes on the `<input>` element |

## Examples

### With leading icon

```tsx
import { Input, Icon } from "@particle-academy/react-fancy";

<Input
  label="Search"
  type="search"
  leading={<Icon name="search" size="sm" />}
  placeholder="Search..."
/>
```

### With prefix and suffix

```tsx
<Input prefix="https://" suffix=".com" placeholder="yoursite" />
```

### Controlled with onValueChange

```tsx
const [email, setEmail] = useState("");

<Input
  label="Email"
  type="email"
  value={email}
  onValueChange={setEmail}
  error={email ? undefined : "Required"}
/>
```

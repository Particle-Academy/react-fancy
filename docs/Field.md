# Field

Form wrapper that adds a label, description, and error message around any input.

## Import

```tsx
import { Field } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Field label="Email" error={errors.email} required>
  <input type="email" />
</Field>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Label text displayed above the children |
| `description` | `string` | - | Helper text shown below children (hidden when `error` is set) |
| `error` | `string` | - | Error message shown below children in red |
| `required` | `boolean` | `false` | Appends a red asterisk to the label |
| `htmlFor` | `string` | - | Connects the label to an input via `id` |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Controls label text size |
| `children` | `ReactNode` | **required** | The input element(s) to wrap |
| `className` | `string` | - | Additional CSS classes on the outer `div` |

## Examples

### With description

```tsx
<Field label="Username" description="Must be 3-20 characters.">
  <Input name="username" />
</Field>
```

### With error

```tsx
<Field label="Password" error="Password is required." required>
  <Input type="password" name="password" />
</Field>
```

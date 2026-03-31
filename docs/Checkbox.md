# Checkbox / CheckboxGroup

Single checkbox with optional label, and a group component for managing multiple checkbox selections.

## Import

```tsx
import { Checkbox, CheckboxGroup } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Checkbox label="I agree to the terms" />
```

```tsx
<CheckboxGroup
  label="Interests"
  list={["Music", "Sports", "Travel"]}
  onValueChange={(values) => console.log(values)}
/>
```

## Checkbox Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | - | Controlled checked state |
| `defaultChecked` | `boolean` | `false` | Initial checked state (uncontrolled) |
| `onCheckedChange` | `(checked: boolean) => void` | - | Callback when checked state changes |
| `indeterminate` | `boolean` | `false` | Sets the indeterminate visual state |
| `label` | `string` | - | Label text next to the checkbox |
| `description` | `string` | - | Helper text below the label |
| `error` | `string` | - | Error message |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Checkbox size |
| `dirty` | `boolean` | `false` | Amber ring |
| `required` | `boolean` | `false` | Red asterisk on label |
| `disabled` | `boolean` | `false` | Disables the checkbox |
| `className` | `string` | - | Additional CSS classes |

## CheckboxGroup Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `list` | `InputOption[]` | **required** | Options as strings or `{ value, label, disabled?, description? }` |
| `value` | `V[]` | - | Controlled selected values |
| `defaultValue` | `V[]` | `[]` | Default selected values (uncontrolled) |
| `onValueChange` | `(values: V[]) => void` | - | Callback when selection changes |
| `orientation` | `"horizontal" \| "vertical"` | `"vertical"` | Layout direction |
| `label` | `string` | - | Group label (wraps in `Field`) |
| `description` | `string` | - | Helper text |
| `error` | `string` | - | Error message |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Checkbox size |
| `dirty` | `boolean` | `false` | Amber ring on all checkboxes |
| `disabled` | `boolean` | `false` | Disables all checkboxes |

## Examples

### Controlled checkbox

```tsx
const [agreed, setAgreed] = useState(false);

<Checkbox
  label="Subscribe to newsletter"
  checked={agreed}
  onCheckedChange={setAgreed}
/>
```

### Horizontal checkbox group with objects

```tsx
<CheckboxGroup
  label="Permissions"
  orientation="horizontal"
  list={[
    { value: "read", label: "Read" },
    { value: "write", label: "Write" },
    { value: "delete", label: "Delete", description: "Dangerous" },
  ]}
  defaultValue={["read"]}
  onValueChange={setPermissions}
/>
```

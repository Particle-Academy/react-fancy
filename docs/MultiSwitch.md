# MultiSwitch

Segmented control that allows selecting one value from a set of options, with an animated sliding indicator.

## Import

```tsx
import { MultiSwitch } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<MultiSwitch
  list={["Daily", "Weekly", "Monthly"]}
  defaultValue="Weekly"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `list` | `InputOption[]` | **required** | Options as strings or `{ value, label, disabled? }` |
| `value` | `V` | - | Controlled selected value |
| `defaultValue` | `V` | first option | Default selected value (uncontrolled) |
| `onValueChange` | `(value: V) => void` | - | Callback when selection changes |
| `linear` | `boolean` | `false` | When true, clicking any button cycles to the next option instead of selecting the clicked one |
| `label` | `string` | - | Wraps in a `Field` with this label |
| `description` | `string` | - | Helper text |
| `error` | `string` | - | Error message |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Controls padding and text size |
| `dirty` | `boolean` | `false` | Amber ring |
| `disabled` | `boolean` | `false` | Disables all options |
| `name` | `string` | - | Form field name (renders a hidden input) |
| `className` | `string` | - | Additional CSS classes |

## Examples

### Controlled with label

```tsx
const [interval, setInterval] = useState("monthly");

<MultiSwitch
  label="Billing interval"
  list={[
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ]}
  value={interval}
  onValueChange={setInterval}
/>
```

### Linear cycling

```tsx
<MultiSwitch
  linear
  list={["Off", "Low", "Medium", "High"]}
  defaultValue="Off"
/>
```

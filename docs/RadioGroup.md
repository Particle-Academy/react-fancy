# RadioGroup

Radio button group for single-value selection from a list of options.

## Import

```tsx
import { RadioGroup } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<RadioGroup
  label="Plan"
  list={["Free", "Pro", "Enterprise"]}
  onValueChange={(plan) => console.log(plan)}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `list` | `InputOption[]` | **required** | Options as strings or `{ value, label, disabled?, description? }` |
| `value` | `V` | - | Controlled selected value |
| `defaultValue` | `V` | - | Default selected value (uncontrolled) |
| `onValueChange` | `(value: V) => void` | - | Callback when selection changes |
| `orientation` | `"horizontal" \| "vertical"` | `"vertical"` | Layout direction |
| `label` | `string` | - | Group label (wraps in `Field`) |
| `description` | `string` | - | Helper text |
| `error` | `string` | - | Error message |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Radio button size |
| `dirty` | `boolean` | `false` | Amber ring on all radios |
| `required` | `boolean` | `false` | Red asterisk on label |
| `disabled` | `boolean` | `false` | Disables all radios |
| `name` | `string` | auto-generated | HTML `name` attribute for the radio group |
| `className` | `string` | - | Additional CSS classes |

## Examples

### Horizontal layout with descriptions

```tsx
<RadioGroup
  label="Priority"
  orientation="horizontal"
  list={[
    { value: "low", label: "Low", description: "No rush" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High", description: "Urgent" },
  ]}
  defaultValue="medium"
  onValueChange={setPriority}
/>
```

### Controlled

```tsx
const [color, setColor] = useState("blue");

<RadioGroup
  label="Theme color"
  list={["red", "blue", "green"]}
  value={color}
  onValueChange={setColor}
/>
```

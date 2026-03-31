# Slider

Range slider supporting single-value and dual-thumb range modes, with optional marks and value display.

## Import

```tsx
import { Slider } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Slider label="Volume" defaultValue={50} showValue />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `step` | `number` | `1` | Step increment |
| `showValue` | `boolean` | `false` | Display current value beside the slider |
| `marks` | `{ value: number; label?: string }[]` | - | Tick marks below the track |
| `prefix` | `ReactNode` | - | Prefix before the displayed value (e.g. `"$"`) |
| `suffix` | `ReactNode` | - | Suffix after the displayed value (e.g. `"%"`) |
| `range` | `boolean` | `false` | Enable dual-thumb range mode |
| `value` | `number` (single) / `[number, number]` (range) | - | Controlled value |
| `defaultValue` | `number` / `[number, number]` | `min` / `[min, max]` | Default value (uncontrolled) |
| `onValueChange` | `(value) => void` | - | Callback when value changes |
| `label` | `string` | - | Wraps in a `Field` with this label |
| `description` | `string` | - | Helper text |
| `error` | `string` | - | Error message |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Track thickness |
| `dirty` | `boolean` | `false` | Amber ring |
| `disabled` | `boolean` | `false` | Disables the slider |
| `className` | `string` | - | Additional CSS classes |

## Examples

### With marks and suffix

```tsx
<Slider
  label="Temperature"
  min={0}
  max={100}
  step={10}
  showValue
  suffix="°C"
  marks={[
    { value: 0, label: "Cold" },
    { value: 50, label: "Warm" },
    { value: 100, label: "Hot" },
  ]}
/>
```

### Range slider

```tsx
const [range, setRange] = useState<[number, number]>([20, 80]);

<Slider
  label="Price range"
  range
  min={0}
  max={200}
  prefix="$"
  showValue
  value={range}
  onValueChange={setRange}
/>
```

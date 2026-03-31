# DatePicker

Date input using native browser date/datetime pickers, supporting single dates and date ranges.

## Import

```tsx
import { DatePicker } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<DatePicker label="Start date" onValueChange={(date) => console.log(date)} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `range` | `boolean` | `false` | Enable range mode (renders two inputs with "to" separator) |
| `includeTime` | `boolean` | `false` | Use `datetime-local` instead of `date` |
| `min` | `string` | - | Minimum date (ISO format, e.g. `"2024-01-01"`) |
| `max` | `string` | - | Maximum date |
| `value` | `string` (single) / `[string, string]` (range) | - | Controlled value |
| `defaultValue` | `string` / `[string, string]` | `""` / `["", ""]` | Default value (uncontrolled) |
| `onValueChange` | `(value) => void` | - | Callback when value changes |
| `label` | `string` | - | Wraps in a `Field` with this label |
| `description` | `string` | - | Helper text |
| `error` | `string` | - | Error message |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Controls sizing |
| `dirty` | `boolean` | `false` | Amber ring |
| `required` | `boolean` | `false` | Native required attribute + red asterisk |
| `disabled` | `boolean` | `false` | Disables the input(s) |
| `name` | `string` | - | Form field name. In range mode, generates `name_start` and `name_end`. |
| `className` | `string` | - | Additional CSS classes |

## Examples

### Date with time

```tsx
<DatePicker
  label="Event start"
  includeTime
  min="2024-01-01T00:00"
  onValueChange={setEventStart}
/>
```

### Date range

```tsx
const [range, setRange] = useState<[string, string]>(["", ""]);

<DatePicker
  label="Vacation"
  range
  value={range}
  onValueChange={setRange}
  min="2024-01-01"
  max="2025-12-31"
/>
```

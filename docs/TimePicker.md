# TimePicker

Spinner-style time picker with hour/minute columns and optional 12h/24h format.

## Import

```tsx
import { TimePicker } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<TimePicker onChange={(time) => console.log(time)} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Controlled value in `"HH:MM"` 24h format |
| `defaultValue` | `string` | `"12:00"` | Default time (uncontrolled) |
| `onChange` | `(value: string) => void` | - | Callback with time string in `"HH:MM"` 24h format |
| `format` | `"12h" \| "24h"` | `"12h"` | Display format. `"12h"` shows an AM/PM toggle button. |
| `minuteStep` | `number` | `1` | Minute increment per click |
| `disabled` | `boolean` | `false` | Disables all controls |
| `className` | `string` | - | Additional CSS classes |

**Note:** Regardless of display format, the `value` and `onChange` always use 24-hour `"HH:MM"` strings.

## Examples

### 24-hour format with 15-minute steps

```tsx
<TimePicker format="24h" minuteStep={15} defaultValue="09:00" />
```

### Controlled

```tsx
const [time, setTime] = useState("14:30");

<TimePicker value={time} onChange={setTime} />
```

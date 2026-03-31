# OtpInput

One-time password input with individual digit cells, auto-advance, and paste support.

## Import

```tsx
import { OtpInput } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<OtpInput length={6} onChange={(code) => console.log(code)} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `length` | `number` | `6` | Number of digit cells |
| `value` | `string` | - | Controlled value |
| `onChange` | `(value: string) => void` | - | Callback with the full OTP string |
| `disabled` | `boolean` | `false` | Disables all inputs |
| `autoFocus` | `boolean` | `false` | Auto-focus the first cell on mount |
| `className` | `string` | - | Additional CSS classes on the container |

**Behavior:**
- Only numeric digits are accepted.
- Focus advances to the next cell after input.
- **Backspace** clears the current cell, or moves to the previous cell if already empty.
- **Arrow keys** move focus between cells.
- **Paste** fills cells from the clipboard (non-numeric characters are stripped).

## Examples

### 4-digit code with auto-focus

```tsx
const [code, setCode] = useState("");

<OtpInput
  length={4}
  autoFocus
  value={code}
  onChange={setCode}
/>
```

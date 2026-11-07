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
| `label` | `string` | `"Verification code"` | Accessible name of the group of cells. Ignored when `aria-labelledby` is given |
| `aria-labelledby` | `string` | - | Id of a visible element naming the group; wins over `label` |
| `labels` | `{ digit?: string }` | `{ digit: "Digit {n} of {total}" }` | Each cell's accessible name; `{n}` is its position, `{total}` the code length |

**Behavior:**
- The cells sit in one `role="group"`, named by `label` or `aria-labelledby`.
- The first cell has `autocomplete="one-time-code"`, so iOS and Android offer the code from a text message; the others have `autocomplete="off"`.
- Only numeric digits are accepted.
- Focus advances to the next cell after input.
- Several digits arriving in one cell (SMS autofill, an IME, a paste routed through input) are spread across the cells from that cell, and focus moves to the next empty cell, or the last.
- The cells stay left-to-right in an RTL page, and the arrow keys move visually.
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

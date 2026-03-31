# Textarea

Multi-line text input with optional auto-resize, label, error, and prefix/suffix support.

## Import

```tsx
import { Textarea } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Textarea label="Bio" placeholder="Tell us about yourself..." />
```

## Props

Extends all native `<textarea>` attributes (except `size`, `prefix`).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Controls text size and padding |
| `autoResize` | `boolean` | `false` | Auto-grows height to fit content |
| `minRows` | `number` | `3` | Minimum visible rows |
| `maxRows` | `number` | - | Maximum rows before scrolling (only applies with `autoResize`) |
| `label` | `string` | - | Wraps textarea in a `Field` with this label |
| `description` | `string` | - | Helper text below the textarea |
| `error` | `string` | - | Error message (red text and border) |
| `required` | `boolean` | `false` | Red asterisk on label |
| `dirty` | `boolean` | `false` | Amber ring to indicate unsaved changes |
| `disabled` | `boolean` | `false` | Disables the textarea |
| `prefix` | `ReactNode` | - | Affix rendered before the textarea (always outside) |
| `suffix` | `ReactNode` | - | Affix rendered after the textarea (always outside) |
| `onValueChange` | `(value: string) => void` | - | Convenience callback with the string value directly |
| `className` | `string` | - | Additional CSS classes on the `<textarea>` |

## Examples

### Auto-resize with max height

```tsx
<Textarea
  label="Message"
  autoResize
  minRows={2}
  maxRows={10}
  placeholder="Type your message..."
/>
```

### Controlled

```tsx
const [notes, setNotes] = useState("");

<Textarea
  label="Notes"
  value={notes}
  onValueChange={setNotes}
/>
```

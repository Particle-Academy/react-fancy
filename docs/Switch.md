# Switch

Toggle switch for boolean on/off states with configurable color and optional label.

## Import

```tsx
import { Switch } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Switch label="Enable notifications" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | - | Controlled checked state |
| `defaultChecked` | `boolean` | `false` | Initial checked state (uncontrolled) |
| `onCheckedChange` | `(checked: boolean) => void` | - | Callback when toggled |
| `color` | `Color` | `"blue"` | Track color when checked. Any Tailwind color: `"zinc"`, `"red"`, `"green"`, `"blue"`, `"purple"`, etc. |
| `label` | `string` | - | Label text next to the switch |
| `description` | `string` | - | Helper text below the label |
| `error` | `string` | - | Error message |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Switch size |
| `dirty` | `boolean` | `false` | Amber ring |
| `required` | `boolean` | `false` | Red asterisk on label |
| `disabled` | `boolean` | `false` | Disables the switch |
| `name` | `string` | - | Form field name (renders a hidden input with value `"1"` or `"0"`) |
| `className` | `string` | - | Additional CSS classes |

## Examples

### Controlled with color

```tsx
const [darkMode, setDarkMode] = useState(false);

<Switch
  label="Dark mode"
  description="Toggle the application theme"
  color="violet"
  checked={darkMode}
  onCheckedChange={setDarkMode}
/>
```

### In a form

```tsx
<Switch name="marketing_emails" label="Receive marketing emails" defaultChecked />
```

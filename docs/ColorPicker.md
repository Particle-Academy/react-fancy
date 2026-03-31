# ColorPicker

A color picker with a swatch button, hex display, and optional preset colors.

## Import

```tsx
import { ColorPicker } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<ColorPicker onChange={(color) => console.log(color)} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | - | Controlled hex color value |
| defaultValue | `string` | `"#3b82f6"` | Default hex color (uncontrolled) |
| onChange | `(color: string) => void` | - | Callback when the color changes |
| presets | `string[]` | - | Array of preset hex colors shown in the native picker's datalist |
| size | `"sm" \| "md" \| "lg"` | `"md"` | Swatch and text size |
| variant | `"outline" \| "filled"` | `"outline"` | Swatch border style |
| disabled | `boolean` | `false` | Disable interaction |
| className | `string` | - | Additional CSS classes |

Supports both controlled (`value` + `onChange`) and uncontrolled (`defaultValue`) usage.

## Examples

### With presets

```tsx
<ColorPicker
  defaultValue="#10b981"
  presets={["#ef4444", "#3b82f6", "#10b981", "#f59e0b"]}
/>
```

### Controlled

```tsx
const [color, setColor] = useState("#8b5cf6");

<ColorPicker value={color} onChange={setColor} size="lg" />
```

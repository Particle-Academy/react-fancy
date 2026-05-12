# MoodMeter

A 2D draggable pad that captures a value AND the confidence in that value on the same handle. The halo around the handle shrinks as confidence rises — uncertain readings literally look fuzzier.

Promoted from the dreaming sandbox on 2026-05-12.

## Import

```tsx
import { MoodMeter } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
const [value, setValue] = useState(60);
const [confidence, setConfidence] = useState(0.74);

<MoodMeter
  min={30}
  max={200}
  value={value}
  confidence={confidence}
  onChange={(v, c) => {
    setValue(v);
    setConfidence(c);
  }}
  posted={{ value: 60, confidence: 0.74 }}
  prefix="$"
  suffix="k"
/>
```

## Why

When AIs post a number, humans immediately ask "how sure are you?". Making confidence an explicit sibling of value — and letting the user drag either independently — turns vague "AI suggestion" UX into something you can argue with precisely.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| min | `number` | — | Range minimum. |
| max | `number` | — | Range maximum. |
| step | `number` | `(max-min)/100` | Step for value snapping. |
| value | `number` | — | Current value (controlled). |
| confidence | `number` | — | Current confidence 0..1 (controlled). |
| onChange | `(value, confidence) => void` | — | Fires on drag / pointer events. |
| posted | `{ value, confidence }` | — | Optional agent post — renders as a dashed ghost handle. |
| width | `number` | `320` | Pad width in pixels. |
| height | `number` | `220` | Pad height in pixels. |
| showGrid | `boolean` | `true` | Show the grid + axis labels. |
| color | `string` | `"#0ea5e9"` | User handle colour. |
| postedColor | `string` | `"#a855f7"` | Ghost handle colour. |
| prefix | `string` | `""` | Prefix for the value label (e.g. `"$"`). |
| suffix | `string` | `""` | Suffix for the value label (e.g. `"k"`, `"%"`). |
| formatValue | `(v) => string` | — | Override the label formatting. |
| className | `string` | — | Applied to the pad. |

## Pad Axes

- **x-axis** → value range `[min..max]`
- **y-axis** → confidence `[0..1]` (top = sure)
- **halo radius** → scales inversely with confidence (large halo = unsure)

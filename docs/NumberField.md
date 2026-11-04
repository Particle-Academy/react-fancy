# NumberField

A controlled numeric field whose value is a `number` or `null`. Blank is `null`, never `0`, half-typed text never emits a wrong number, and the mouse wheel does not change it.

Reach for it over `<Input type="number">` when the value is a number rather than a string, or when "no value" must stay different from zero: a temperature, a quantity, a price, a score.

## Import

```tsx
import { NumberField } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
const [value, setValue] = useState<number | null>(null);

<NumberField label="Quantity" value={value} onValueChange={setValue} min={0} step={1} />
```

## Props

Extends the native `<input>` attributes, except `size`, `type`, `prefix`, `value`, `defaultValue`, `min`, `max` and `step`, which are declared here.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| null` | - | The number, or `null` for none. A `NaN` or `Infinity` shows as blank |
| `defaultValue` | `number \| null` | `null` | Starting value when uncontrolled |
| `onValueChange` | `(value: number \| null) => void` | - | Called when the value changes |
| `min` | `number` | - | Lowest valid value. The arrow keys stop here |
| `max` | `number` | - | Highest valid value. The arrow keys stop here |
| `step` | `number \| "any"` | - | What the arrow keys move by, on a grid counted from `min` (or 0). Declaring a number also makes off-grid values invalid. Omitted or `"any"`, the arrows move by 1 and any number is valid |
| `name` | `string` | - | Posts the number through a hidden input, not the text on screen. Blank posts an empty string |
| `suffix` / `prefix` | `ReactNode` | - | Affixes, for a unit: `suffix="kg"` |
| `suffixPosition` / `prefixPosition` | `"inside" \| "outside"` | - | Where the affix renders |
| `leading` / `trailing` | `ReactNode` | - | Icon or element inside the field |
| `messages` | `{ invalid?, min?, max?, step? }` | English | Validation messages, for a host working in another language |
| `mode` | `"edit" \| "view"` | `"edit"` | `"view"` shows the value as text, with click-to-edit |
| `label`, `description`, `error`, `required`, `dirty`, `disabled`, `size` | | | As on [`Input`](Input.md) |

## What it does with what you type

| Typed | `onValueChange` receives | Why |
|---|---|---|
| (cleared) | `null` | Blank is not zero |
| `42` | `42` | |
| `-`, `.`, `1e`, `+` | `null`, if it held a number | Not a number yet. Keeping the old number would submit one that is no longer on screen |
| `1.` | `1` | The text stays `1.` while you type, and becomes `1` on blur |
| `1e5` | `100000` | |
| `0x10`, `Infinity`, `1,000` | `null` | Decimal notation only. Separators and comma decimals are not read, so a number is never guessed |
| `5` with `min={10}` | `5` | It may be on its way to `50`. Reported as invalid, not rewritten |

When focus leaves the field, the text is replaced with what the value is, so unreadable text clears.

## Validation

`min`, `max` and a declared `step` are not native constraints on this input, so they are reported through `setCustomValidity` and `aria-invalid`. `form.checkValidity()` and the browser's submit blocking behave as they do on a number input. `required` is native. Show your own message with `error`.

The default `step` differs from `<input type="number">` on one point: undeclared, a native field rejects `1.5`, and this one accepts it.

## Agents

The field is controlled, so an agent reads and writes `value` like anything else. `[data-react-fancy-number-field]` marks the field in both edit and view mode, and `role="spinbutton"` carries `aria-valuenow` (absent when blank), `aria-valuemin` and `aria-valuemax`. Writing a number from an MCP tool does not go through the text, so partial input does not apply to it.

## Examples

### With a unit

```tsx
<NumberField label="Weight" value={weight} onValueChange={setWeight} min={0} step={0.1} suffix="kg" />
```

### Negative values

```tsx
<NumberField label="Temperature" value={temp} onValueChange={setTemp} min={-40} max={60} suffix="°C" />
```

### In a form

```tsx
<form action="/order" method="post">
  <NumberField name="quantity" label="Quantity" value={qty} onValueChange={setQty} min={1} step={1} required />
</form>
```

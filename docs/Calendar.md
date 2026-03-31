# Calendar

Inline calendar widget supporting single date, multiple date, and date range selection.

## Import

```tsx
import { Calendar } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Calendar onChange={(date) => console.log(date)} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `"single" \| "range" \| "multiple"` | `"single"` | Selection mode |
| `value` | `Date \| Date[] \| DateRange \| null` | - | Controlled value (type depends on mode) |
| `onChange` | `(value: Date \| Date[] \| DateRange \| null) => void` | - | Callback when selection changes |
| `minDate` | `Date` | - | Earliest selectable date |
| `maxDate` | `Date` | - | Latest selectable date |
| `disabledDates` | `Date[]` | `[]` | Specific dates to disable |
| `className` | `string` | - | Additional CSS classes |

### DateRange type

```ts
interface DateRange {
  start: Date | null;
  end: Date | null;
}
```

**Behavior:**
- Month navigation via chevron buttons.
- Today is visually emphasized with bold text.
- In `"range"` mode, hovering previews the range highlight before the second click.
- Out-of-month days are dimmed but still clickable.

## Examples

### Date range selection

```tsx
const [range, setRange] = useState<DateRange>({ start: null, end: null });

<Calendar
  mode="range"
  value={range}
  onChange={setRange}
  minDate={new Date()}
/>
```

### Multiple dates with constraints

```tsx
const [dates, setDates] = useState<Date[]>([]);

<Calendar
  mode="multiple"
  value={dates}
  onChange={setDates}
  minDate={new Date(2024, 0, 1)}
  maxDate={new Date(2024, 11, 31)}
  disabledDates={[new Date(2024, 6, 4)]}
/>
```

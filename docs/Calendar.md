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
| `dateId` | `(date: Date) => string` | `YYYY-MM-DD` (local) | Stable id per day, emitted as `data-react-fancy-calendar-day` (5.56.0) |
| `renderDay` | `(ctx: CalendarDayContext) => ReactNode` | day number | The day cell's content; the cell itself stays the Calendar's (5.56.0) |
| `dayClassName` | `(ctx: CalendarDayContext) => string \| undefined` | - | Extra classes for one day, merged after the built-in ones (5.56.0) |
| `dayAriaLabel` | `(ctx: CalendarDayContext) => string \| undefined` | - | The day's accessible name. Required in practice whenever `dayClassName` shades a day: colour alone is not a signal. Replaces the name, so include the date (5.56.0) |
| `visibleMonth` | `Date` | - | Controlled visible month (any day in it). Uncontrolled when omitted (5.56.0) |
| `onVisibleMonthChange` | `(month: Date) => void` | - | Called with the 1st of the month navigated to (5.56.0) |

### CalendarDayContext

```ts
interface CalendarDayContext {
  date: Date;
  id: string;          // dateId(date)
  selected: boolean;
  disabled: boolean;
  inRange: boolean;    // strictly between a range's ends
  outsideMonth: boolean;
  today: boolean;
}
```

Out-of-month day cells also carry `data-outside-month`, and the month heading
carries `data-react-fancy-calendar-month`.

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

### Coverage shading, a controlled month, open a day on click

```tsx
const [month, setMonth] = useState(new Date(2026, 9, 1));

<Calendar
  visibleMonth={month}
  onVisibleMonthChange={setMonth}
  onChange={(d) => openDay(d as Date)}
  dayClassName={(ctx) => (coverage[ctx.id] === "full" ? "bg-emerald-100 dark:bg-emerald-900/50" : undefined)}
  dayAriaLabel={(ctx) => (coverage[ctx.id] ? `${ctx.date.toDateString()}, ${coverage[ctx.id]} coverage` : undefined)}
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

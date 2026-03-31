# Timeline

A timeline component supporting stacked, alternating, and horizontal layouts. Can be used data-driven (via the `events` prop) or as a compound component with `Timeline.Item` and `Timeline.Block`.

## Import

```tsx
import { Timeline } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Timeline>
  <Timeline.Item date="Jan 2024">
    <h3>Project started</h3>
  </Timeline.Item>
  <Timeline.Item date="Mar 2024">
    <h3>First release</h3>
  </Timeline.Item>
</Timeline>
```

## Timeline Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Compound children (`Timeline.Item` or `Timeline.Block`) |
| variant | `"stacked" \| "alternating" \| "horizontal"` | `"stacked"` | Layout variant |
| events | `TimelineEvent[]` | - | Data-driven events (alternative to children) |
| heading | `ReactNode` | - | Optional heading above the timeline |
| description | `ReactNode` | - | Optional description below the heading |
| animated | `boolean` | `true` | Enable scroll-reveal animation |
| className | `string` | - | Additional CSS classes |

## Timeline.Item Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item content |
| icon | `ReactNode` | - | Custom icon for the dot |
| emoji | `string` | - | Emoji character for the dot |
| date | `string` | - | Date label displayed above the content |
| color | `Color` | `"zinc"` | Dot accent color (any Tailwind color name) |
| active | `boolean` | `false` | Whether this item is the active/current step |
| className | `string` | - | Additional CSS classes |

## Timeline.Block Props

A convenience wrapper around `Timeline.Item` that renders content inside a bordered card.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| heading | `ReactNode` | - | Block heading |
| children | `ReactNode` | **required** | Block body content |
| icon | `ReactNode` | - | Icon for the dot |
| emoji | `string` | - | Emoji for the dot |
| color | `Color` | `"zinc"` | Dot/icon color |
| active | `boolean` | `false` | Whether this block is active (adds ring highlight) |
| className | `string` | - | Additional CSS classes |

## TimelineEvent (data-driven)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | `string` | yes | Event heading |
| description | `string` | no | Body text |
| date | `string` | no | Date string |
| emoji | `string` | no | Emoji for the dot |
| icon | `ReactNode` | no | Custom icon for the dot |
| color | `Color` | no | Accent color |

## Examples

### Data-driven timeline

```tsx
<Timeline
  heading="Project History"
  events={[
    { date: "Jan 2024", title: "Kickoff", description: "Project started", color: "blue" },
    { date: "Mar 2024", title: "Beta", description: "First beta release", emoji: "🚀" },
    { date: "Jun 2024", title: "Launch", description: "Public launch", color: "green" },
  ]}
/>
```

### Alternating layout with blocks

```tsx
<Timeline variant="alternating">
  <Timeline.Block heading="Design" color="violet" emoji="🎨">
    Completed wireframes and mockups.
  </Timeline.Block>
  <Timeline.Block heading="Development" color="blue" active>
    Building core features.
  </Timeline.Block>
  <Timeline.Block heading="Launch" color="green">
    Planned for Q3.
  </Timeline.Block>
</Timeline>
```

### Horizontal timeline

```tsx
<Timeline variant="horizontal">
  <Timeline.Item date="Step 1" color="blue">
    <h3 className="font-semibold">Sign up</h3>
  </Timeline.Item>
  <Timeline.Item date="Step 2" color="blue">
    <h3 className="font-semibold">Configure</h3>
  </Timeline.Item>
  <Timeline.Item date="Step 3" color="green" active>
    <h3 className="font-semibold">Go live</h3>
  </Timeline.Item>
</Timeline>
```

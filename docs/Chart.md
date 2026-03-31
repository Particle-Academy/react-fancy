# Chart

A collection of SVG chart components: Bar, HorizontalBar, StackedBar, Line, Area, Pie, Donut, and Sparkline.

## Import

```tsx
import { Chart } from "@particle-academy/react-fancy";
```

## Chart Types

### Chart.Bar

```tsx
<Chart.Bar
  data={[
    { label: "Jan", value: 30 },
    { label: "Feb", value: 45 },
    { label: "Mar", value: 28 },
  ]}
  height={200}
  showValues
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| data | `ChartBarData[]` | - | Array of `{ label, value, color? }` |
| height | `number` | - | Chart height in px |
| showValues | `boolean` | - | Display values above bars |
| className | `string` | - | Additional CSS classes |

### Chart.HorizontalBar

Same props as `Chart.Bar`, rendered horizontally.

### Chart.Line

```tsx
<Chart.Line
  labels={["Jan", "Feb", "Mar", "Apr"]}
  series={[
    { label: "Revenue", data: [100, 200, 150, 300], color: "#3b82f6" },
    { label: "Costs", data: [80, 120, 100, 180], color: "#ef4444" },
  ]}
  height={300}
  showDots
  tooltip
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| labels | `string[]` | - | X-axis labels |
| series | `ChartSeries[]` | - | Array of `{ label, data, color? }` |
| curve | `"linear" \| "monotone"` | - | Line interpolation |
| showDots | `boolean` | - | Show data points |
| fill | `boolean` | - | Fill area under line |
| fillOpacity | `number` | - | Opacity of fill area |
| height | `number` | - | Chart height in px |
| xAxis | `boolean \| { label?, tickCount? }` | - | X-axis config |
| yAxis | `boolean \| { label?, tickCount? }` | - | Y-axis config |
| grid | `boolean \| { horizontal?, vertical? }` | - | Grid lines |
| tooltip | `boolean` | - | Show tooltip on hover |
| animate | `boolean` | - | Enable animations |
| responsive | `boolean` | - | Responsive width |
| className | `string` | - | Additional CSS classes |

### Chart.Area

Same as `Chart.Line` without the `fill` prop (area fill is always enabled).

### Chart.StackedBar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| labels | `string[]` | - | X-axis labels |
| series | `ChartSeries[]` | - | Stacked data series |
| *(plus ChartCommonProps)* | | | height, xAxis, yAxis, grid, tooltip, animate, responsive |

### Chart.Pie

```tsx
<Chart.Pie
  data={[
    { label: "Desktop", value: 60 },
    { label: "Mobile", value: 35 },
    { label: "Tablet", value: 5 },
  ]}
  size={200}
  showLabels
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| data | `ChartPieData[]` | - | Array of `{ label, value, color? }` |
| size | `number` | - | Diameter in px |
| showLabels | `boolean` | - | Display labels |
| tooltip | `boolean` | - | Show tooltip on hover |
| className | `string` | - | Additional CSS classes |

### Chart.Donut

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| data | `ChartDonutData[]` | - | Array of `{ label, value, color? }` |
| size | `number` | - | Diameter in px |
| strokeWidth | `number` | - | Ring thickness |
| showLegend | `boolean` | - | Show legend |
| className | `string` | - | Additional CSS classes |

### Chart.Sparkline

```tsx
<Chart.Sparkline data={[5, 10, 8, 15, 12, 20]} width={120} height={32} color="#22c55e" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| data | `number[]` | - | Data points |
| width | `number` | - | Chart width in px |
| height | `number` | - | Chart height in px |
| color | `string` | - | Line color |
| className | `string` | - | Additional CSS classes |

# Canvas

An infinite pannable and zoomable canvas for positioning nodes with edges between them. Includes minimap and zoom controls.

## Import

```tsx
import { Canvas } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Canvas className="h-96 w-full" showGrid>
  <Canvas.Node id="a" x={50} y={50} draggable>
    <div className="rounded border bg-white p-4">Node A</div>
  </Canvas.Node>
  <Canvas.Node id="b" x={300} y={150} draggable>
    <div className="rounded border bg-white p-4">Node B</div>
  </Canvas.Node>
  <Canvas.Edge from="a" to="b" curve="bezier" markerEnd="canvas-arrow" />
  <Canvas.Controls />
  <Canvas.Minimap />
</Canvas>
```

## Props

### Canvas (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| viewport | `ViewportState` | - | Controlled viewport `{ panX, panY, zoom }` |
| defaultViewport | `ViewportState` | `{ panX: 0, panY: 0, zoom: 1 }` | Default viewport (uncontrolled) |
| onViewportChange | `(viewport: ViewportState) => void` | - | Callback when viewport changes |
| minZoom | `number` | `0.1` | Minimum zoom level |
| maxZoom | `number` | `3` | Maximum zoom level |
| pannable | `boolean` | `true` | Enable panning (click+drag on background) |
| zoomable | `boolean` | `true` | Enable zoom (Ctrl+scroll) |
| gridSize | `number` | `20` | Grid cell size in canvas-space pixels |
| showGrid | `boolean` | `false` | Display the canvas grid background |
| gridStyle | `'dots' \| 'lines' \| 'none'` | `'dots'` | Grid pattern when shown. `'none'` hides the grid even when `showGrid` is true |
| gridColor | `string` | `'rgb(161 161 170 / 0.3)'` | Any CSS color for grid dots/lines |
| snapToGrid | `boolean` | `false` | Snap dragged nodes to the grid |
| fitOnMount | `boolean` | `false` | Auto-fit all nodes into view on mount |
| className | `string` | - | Additional CSS classes |
| style | `CSSProperties` | - | Inline styles |

### Canvas.Node

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | `string` | - | Unique node identifier (required) |
| x | `number` | - | X position in canvas coordinates (required) |
| y | `number` | - | Y position in canvas coordinates (required) |
| draggable | `boolean` | - | Allow drag-to-move |
| onPositionChange | `(x: number, y: number) => void` | - | Callback when dragged to a new position |
| className | `string` | - | Additional CSS classes |
| style | `CSSProperties` | - | Inline styles |

### Canvas.Edge

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| from | `string` | - | Source node id (required) |
| to | `string` | - | Target node id (required) |
| fromAnchor | `EdgeAnchor` | - | Anchor point on source: `"top"`, `"bottom"`, `"left"`, `"right"`, `"center"`, `"auto"` |
| toAnchor | `EdgeAnchor` | - | Anchor point on target |
| curve | `"bezier" \| "step" \| "straight"` | - | Path interpolation |
| color | `string` | - | Stroke color |
| strokeWidth | `number` | - | Stroke width |
| dashed | `boolean` | - | Dashed line |
| animated | `boolean` | - | Animated dash pattern |
| label | `ReactNode` | - | Label at the midpoint |
| markerStart | `string` | - | SVG marker id for start (e.g. `"canvas-arrow"`, `"canvas-circle"`, `"canvas-diamond"`) |
| markerEnd | `string` | - | SVG marker id for end |
| className | `string` | - | Additional CSS classes |

### Canvas.Controls

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| showZoomIn | `boolean` | - | Show zoom-in button |
| showZoomOut | `boolean` | - | Show zoom-out button |
| showReset | `boolean` | - | Show reset-viewport button |
| showFitAll | `boolean` | - | Show fit-all button |
| className | `string` | - | Additional CSS classes |

### Canvas.Minimap

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| width | `number` | - | Minimap width in px |
| height | `number` | - | Minimap height in px |
| className | `string` | - | Additional CSS classes |

### ViewportState

```ts
{ panX: number; panY: number; zoom: number }
```

## Built-in SVG Markers

The Canvas includes predefined SVG markers for edge endpoints: `"canvas-arrow"`, `"canvas-circle"`, `"canvas-diamond"`, `"canvas-one"`, `"canvas-crow-foot"`.

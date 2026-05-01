# Diagram

A high-level ERD/flowchart diagram built on top of Canvas. Accepts a schema of entities and relations, auto-layouts positions, and supports drag-to-move, export, and import.

## Import

```tsx
import { Diagram } from "@particle-academy/react-fancy";
```

## Basic Usage (Schema-driven)

```tsx
const schema = {
  entities: [
    {
      name: "users",
      fields: [
        { name: "id", type: "bigint", primary: true },
        { name: "name", type: "varchar" },
        { name: "email", type: "varchar" },
      ],
    },
    {
      name: "posts",
      fields: [
        { name: "id", type: "bigint", primary: true },
        { name: "user_id", type: "bigint", foreign: true },
        { name: "title", type: "varchar" },
        { name: "body", type: "text", nullable: true },
      ],
    },
  ],
  relations: [
    { from: "users", to: "posts", type: "one-to-many" },
  ],
};

<Diagram schema={schema} className="h-[600px]" downloadable minimap />
```

## Props

### Diagram (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| schema | `DiagramSchema` | - | Declarative schema of entities and relations |
| type | `"erd" \| "flowchart" \| "general"` | `"general"` | Diagram type (affects relation rendering) |
| viewport | `ViewportState` | - | Controlled viewport |
| defaultViewport | `ViewportState` | - | Default viewport (auto-computed from schema if omitted) |
| onViewportChange | `(viewport: ViewportState) => void` | - | Viewport change callback |
| downloadable | `boolean` | `false` | Enable download toolbar action |
| importable | `boolean` | `false` | Enable import toolbar action |
| exportFormats | `ExportFormat[]` | `["erd"]` | Export format options: `"erd"`, `"uml"`, `"dfd"` |
| onImport | `(schema: DiagramSchema) => void` | - | Callback when a schema is imported |
| minimap | `boolean` | `false` | Show minimap overlay |
| className | `string` | - | Additional CSS classes |

### Diagram.Entity

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | `string` | - | Unique identifier (defaults to `name`) |
| name | `string` | - | Entity name (required) |
| x | `number` | - | X position |
| y | `number` | - | Y position |
| color | `string` | - | Header color |
| draggable | `boolean` | - | Allow drag-to-move |
| onPositionChange | `(x: number, y: number) => void` | - | Drag callback |
| children | `ReactNode` | - | Field children |
| className | `string` | - | Additional CSS classes |

### Diagram.Field

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| name | `string` | - | Field name (required) |
| type | `string` | - | Data type label |
| primary | `boolean` | - | Primary key indicator |
| foreign | `boolean` | - | Foreign key indicator |
| nullable | `boolean` | - | Nullable indicator |
| className | `string` | - | Additional CSS classes |

### Diagram.Relation

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| from | `string` | - | Source entity id (required) |
| to | `string` | - | Target entity id (required) |
| fromField | `string` | - | Source field name |
| toField | `string` | - | Target field name |
| type | `RelationType` | - | Shorthand that sets `fromMarker` / `toMarker` / `lineStyle`. See **Relation types** below |
| fromMarker | `MarkerType` | depends on `type` | Marker shape at the source end |
| toMarker | `MarkerType` | depends on `type` | Marker shape at the target end |
| lineStyle | `'solid' \| 'dashed' \| 'dotted'` | from `type` | Line stroke style |
| routing | `'manhattan' \| 'bezier' \| 'straight'` | `'manhattan'` | Path routing algorithm |
| color | `string` | `'#71717a'` | Stroke color |
| strokeWidth | `number` | `2` | Stroke width |
| label | `string` | - | Edge label rendered at the path midpoint |
| className | `string` | - | Additional CSS classes |

### Relation types (`type` shorthand)

| Type | fromMarker | toMarker | lineStyle |
|------|-----------|----------|-----------|
| `one-to-one` | one | one | solid |
| `one-to-many` | one | many | solid |
| `many-to-one` | many | one | solid |
| `many-to-many` | many | many | solid |
| `association` | none | arrow | solid |
| `aggregation` | diamond-open | none | solid |
| `composition` | diamond | none | solid |
| `inheritance` | none | triangle-open | solid |
| `implementation` | none | triangle-open | dashed |
| `dependency` | none | arrow | dashed |
| `custom` | (caller's `fromMarker`) | (caller's `toMarker`) | solid |

### MarkerType

`'none'`, `'arrow'`, `'arrow-open'`, `'circle'`, `'circle-open'`, `'square'`, `'square-open'`, `'diamond'`, `'diamond-open'`, `'triangle'`, `'triangle-open'`, `'one'`, `'many'`, `'optional-one'`, `'optional-many'`, `'cross'`, or any string starting with `emoji:` (e.g. `'emoji:🎯'`) for an emoji/text marker.

### Routing

- **manhattan** (default) — right-angle elbows. Picks the side of each entity that faces the other, with a vertical (or horizontal) mid-line that automatically dodges entities lying along the path. Best for ERD/UML.
- **bezier** — smooth cubic curve with horizontal/vertical control points perpendicular to each side.
- **straight** — direct line between the two anchor points.

### Diagram.Toolbar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | - | Additional CSS classes |

## Declarative Children

You can also compose entities and relations as JSX children instead of (or alongside) the schema prop:

```tsx
<Diagram type="erd" className="h-[500px]">
  <Diagram.Entity name="categories" x={0} y={0} draggable>
    <Diagram.Field name="id" type="int" primary />
    <Diagram.Field name="name" type="varchar" />
  </Diagram.Entity>
  <Diagram.Entity name="products" x={300} y={0} draggable>
    <Diagram.Field name="id" type="int" primary />
    <Diagram.Field name="category_id" type="int" foreign />
  </Diagram.Entity>
  <Diagram.Relation from="categories" to="products" type="one-to-many" />
</Diagram>
```

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
| type | `RelationType` | - | `"one-to-one"`, `"one-to-many"`, or `"many-to-many"` (required) |
| label | `string` | - | Edge label |
| className | `string` | - | Additional CSS classes |

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

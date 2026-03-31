# Kanban

A drag-and-drop kanban board using the HTML5 Drag and Drop API. Cards can be moved between columns.

## Import

```tsx
import { Kanban } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Kanban onCardMove={(cardId, from, to) => console.log(`${cardId}: ${from} -> ${to}`)}>
  <Kanban.Column id="todo" title="To Do">
    <Kanban.Card id="task-1">Design homepage</Kanban.Card>
    <Kanban.Card id="task-2">Write tests</Kanban.Card>
  </Kanban.Column>
  <Kanban.Column id="in-progress" title="In Progress">
    <Kanban.Card id="task-3">Build API</Kanban.Card>
  </Kanban.Column>
  <Kanban.Column id="done" title="Done">
    <Kanban.Card id="task-4">Setup CI/CD</Kanban.Card>
  </Kanban.Column>
</Kanban>
```

## Props

### Kanban (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| onCardMove | `(cardId: string, fromColumn: string, toColumn: string) => void` | - | Callback when a card is dropped into a different column |
| className | `string` | - | Additional CSS classes |

### Kanban.Column

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | `string` | - | Unique column identifier (required) |
| title | `string` | - | Column header text |
| className | `string` | - | Additional CSS classes |

### Kanban.Card

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | `string` | - | Unique card identifier (required) |
| children | `ReactNode` | - | Card content |
| className | `string` | - | Additional CSS classes |

## Stateful Example

```tsx
const [columns, setColumns] = useState({
  todo: ["task-1", "task-2"],
  doing: ["task-3"],
  done: [],
});

function handleMove(cardId: string, from: string, to: string) {
  setColumns((prev) => ({
    ...prev,
    [from]: prev[from].filter((id) => id !== cardId),
    [to]: [...prev[to], cardId],
  }));
}

<Kanban onCardMove={handleMove}>
  {Object.entries(columns).map(([colId, cards]) => (
    <Kanban.Column key={colId} id={colId} title={colId}>
      {cards.map((id) => (
        <Kanban.Card key={id} id={id}>{id}</Kanban.Card>
      ))}
    </Kanban.Column>
  ))}
</Kanban>
```

# Kanban

A drag-and-drop kanban board using the HTML5 Drag and Drop API. Cards drag between columns and within a column; columns can be reordered with a `<Kanban.ColumnHandle>`. Cards accept arbitrary children, so you have full creative control over what each card looks like.

## Import

```tsx
import { Kanban } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Kanban
  onCardMove={(cardId, from, to, toIndex) => {
    // toIndex is the destination position within `to`.
  }}
>
  <Kanban.Column id="todo" title="To Do" wipLimit={4}>
    <Kanban.Card id="task-1">Design homepage</Kanban.Card>
    <Kanban.Card id="task-2">Write tests</Kanban.Card>
  </Kanban.Column>
  <Kanban.Column id="in-progress" title="In Progress" wipLimit={2}>
    <Kanban.Card id="task-3">Build API</Kanban.Card>
  </Kanban.Column>
  <Kanban.Column id="done" title="Done">
    <Kanban.Card id="task-4">Setup CI/CD</Kanban.Card>
  </Kanban.Column>
</Kanban>
```

The board ships with a drop-position indicator (a thin blue line that appears where the dragged card will land), full within-column reorder, and a header chip that shows `count / wipLimit` and turns red over capacity.

## Compound parts

| Component | Role |
|-----------|------|
| `Kanban` | Root. Owns drag state and computes column drop positions. |
| `Kanban.Column` | A drop target. Renders a column header (when `title` is set), tracks card drop position. |
| `Kanban.Card` | A draggable card. Accepts arbitrary children. |
| `Kanban.ColumnHandle` | Optional. Mount inside a column to make that column draggable for column reorder. |

## Props

### Kanban (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCardMove` | `(cardId, fromColumn, toColumn, toIndex) => void` | - | Fires on every card drop. `toIndex` is the destination position within `toColumn` (0-based; equal to current count means append). For a same-column reorder, `fromColumn === toColumn`. |
| `onColumnMove` | `(columnId, toIndex) => void` | - | Fires when a column is dropped at a new position. Only fires if at least one column has a `<Kanban.ColumnHandle>` and a column was actually dragged. |
| `className` | `string` | - | Additional CSS classes |

### Kanban.Column

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Unique column identifier |
| `title` | `string` | - | Column header text. When set, the column renders a built-in header with a count chip (and `count / wipLimit` if `wipLimit` is set). |
| `wipLimit` | `number` | - | Soft work-in-progress limit. The header pill turns red when `cardCount > wipLimit`. Drops are not refused — enforce hard via `onCardMove`. *Since v2.8.0.* |
| `hideWhenEmpty` | `boolean` | `false` | Render nothing when the column has zero card children. The column still re-mounts to receive drops while a card is being dragged elsewhere. *Since v2.8.0.* |
| `unstyled` | `boolean` | `false` | Skip the default visuals (background, padding, min-height, fixed `w-72`) so you can render your own surface around the children. The drop target, drag-over ring, and column id wiring are kept. *Since v2.7.0.* |
| `className` | `string` | - | Additional CSS classes |

### Kanban.Card

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Unique card identifier |
| `children` | `ReactNode` | - | Card content |
| `unstyled` | `boolean` | `false` | Skip the default border / padding / shadow so you can wrap your own `<Card>` (or any surface) inside. Drag handlers and `draggable` stay in place. *Since v2.7.0.* |
| `className` | `string` | - | Additional CSS classes |

### Kanban.ColumnHandle (since v2.8.0)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Render the column header (or a grip icon) inside the handle. Anywhere inside is the drag origin. |
| `className` | `string` | - | Additional CSS classes |

Mount inside a `Kanban.Column`. Without it, the column is static.

## Composing custom card visuals

When you want full control over the card body — wrapping a `<Card>` with avatars, badges, dropdown menus — pass `unstyled` so the Kanban wrapper just provides drag plumbing:

```tsx
<Kanban.Card id={card.id} unstyled>
  <Card variant="elevated" padding="none" className="overflow-hidden">
    {/* your fancy card body */}
  </Card>
</Kanban.Card>
```

Same pattern works for columns:

```tsx
<Kanban.Column id="doing" unstyled wipLimit={3} className="w-80 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
  <Kanban.ColumnHandle>
    <MyColumnHeader title="In progress" wipLimit={3} />
  </Kanban.ColumnHandle>
  {cards.map((c) => <Kanban.Card key={c.id} id={c.id} unstyled>...</Kanban.Card>)}
</Kanban.Column>
```

## Stateful Example

```tsx
const [columns, setColumns] = useState({
  todo: ["task-1", "task-2"],
  doing: ["task-3"],
  done: [],
});
const [order, setOrder] = useState(["todo", "doing", "done"]);

function handleCardMove(cardId, from, to, toIndex) {
  setColumns((prev) => {
    const fromList = prev[from].filter((id) => id !== cardId);
    if (from === to) {
      fromList.splice(toIndex, 0, cardId);
      return { ...prev, [from]: fromList };
    }
    const toList = [...prev[to]];
    toList.splice(toIndex, 0, cardId);
    return { ...prev, [from]: fromList, [to]: toList };
  });
}

function handleColumnMove(id, toIndex) {
  setOrder((prev) => {
    const next = prev.filter((c) => c !== id);
    next.splice(toIndex, 0, id);
    return next;
  });
}

<Kanban onCardMove={handleCardMove} onColumnMove={handleColumnMove}>
  {order.map((colId) => (
    <Kanban.Column key={colId} id={colId} title={colId}>
      <Kanban.ColumnHandle>{/* header */}</Kanban.ColumnHandle>
      {columns[colId].map((id) => (
        <Kanban.Card key={id} id={id}>{id}</Kanban.Card>
      ))}
    </Kanban.Column>
  ))}
</Kanban>
```

## Async move with rollback

`onCardMove` can be `async`. Apply optimistically, revert on failure:

```tsx
async function handleMove(id, from, to, toIndex) {
  const prev = state;
  setState(s => move(s, id, from, to, toIndex));
  try {
    await api.move(id, to, toIndex);
  } catch {
    setState(prev);
    toast.error("Move failed");
  }
}
```

## Pending

The component still doesn't handle:

- **Touch / mobile** — HTML5 DnD is desktop-only.
- **Full keyboard navigation** — arrow-key / space-to-lift move pattern not yet implemented. Roles (`application`, `group`) are in place to lay groundwork.
- **Custom drag preview** — uses the browser default ghost.
- **Multi-select drag.**
- **Swimlanes / row grouping.**

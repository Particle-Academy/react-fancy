# ReorderableGrid

A grid of cells that people reorder in place, row-major, with a pointer or the keyboard. While a cell is dragged, the other cells shift to show where it will land, wrapping across rows. Built for field-order designers: the designer looks like the grid it designs, so an admin arranges a deal's label/value cells in the same 2-to-4-column layout the deal page shows.

The order is a list of ids. The reorder rule is also exported on its own as `moveItem`, so an agent can reorder without the DOM.

## Import

```tsx
import { ReorderableGrid, moveItem } from "@particle-academy/react-fancy";
// or the subpath
import { ReorderableGrid, moveItem } from "@particle-academy/react-fancy/reorderable-grid";
```

## Basic Usage

```tsx
const fields = [
  { id: "amount", label: "Amount", value: "$120,000" },
  { id: "stage", label: "Stage", value: "Negotiation" },
  { id: "owner", label: "Owner", value: "R. Diaz" },
  { id: "close", label: "Close date", value: "2026-12-01" },
  { id: "source", label: "Source", value: "Referral", locked: true },
];

const [order, setOrder] = useState(fields.map((f) => f.id));

<ReorderableGrid
  items={fields}
  value={order}
  onReorder={setOrder}
  columns={4}
  label="Deal field order"
  renderItem={(field) => (
    <>
      <div className="text-xs text-zinc-500">{field.label}</div>
      <div className="font-medium">{field.value}</div>
    </>
  )}
/>
```

Uncontrolled: leave out `value`, optionally pass `defaultValue`, and listen to `onReorder`.

## Order: `value` is a list of ids

`items` carries the data and `value` (or `defaultValue`) carries the order. The order is not taken from `items`. This follows the kit's controlled pattern (`value` / `defaultValue`, see `useControllableState`), and it suits the two consumers:

- **A form or settings row stores ids.** A field-order setting is `["amount", "stage", ...]`. It is JSON, and the host does not have to rebuild its data array on every move.
- **An agent speaks ids too.** `grid_move` and `onReorder` carry the same shape.

The order is reconciled with `items` on every render. Ids that are not in `items` are ignored, and items the order does not mention follow in `items` order. A stale saved order (a field was added since it was saved) never hides a cell.

With neither `value` nor `defaultValue`, the grid starts in `items` order and keeps its own order from then on. To drive the order from outside (a "reset" button, a server push), pass `value`.

`onReorder` gets the **full new order once per committed move**: a pointer release or a keyboard drop that changed something. The live preview during a drag is never reported. A cancel is never reported, and neither is a drop back where the item started.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `T[]` where `T extends { id: string; locked?: boolean }` | **required** | Cell data. Other fields are yours and reach `renderItem` |
| `value` | `string[]` | - | Controlled order (ids) |
| `defaultValue` | `string[]` | - | Uncontrolled starting order. Omit both for `items` order |
| `onReorder` | `(ids: string[]) => void` | - | Full new order, once per committed move |
| `renderItem` | `(item: T, state) => ReactNode` | the item's label | Cell content. See *Item state* |
| `columns` | `number` | `2` | Columns, 1 to 12. Placement is row-major |
| `gap` | `"none" \| "sm" \| "md" \| "lg"` | `"sm"` | Gutter |
| `disabled` | `boolean` | `false` | No reordering, no tab stops |
| `label` | `string` | - | Accessible name of the grid |
| `getItemLabel` | `(item: T) => string` | `item.label`, else the id | The name announcements use |
| `labels` | `Partial<ReorderableGridLabels>` | English | Override any announcement or label (i18n). See *Accessibility* |
| `unstyled` | `boolean` | `false` | Skip the cell's border, surface and padding. Behaviour stays |
| `cellClassName` | `string` | - | Extra classes on every cell |
| `className` | `string` | - | Classes on the root |

Other HTML attributes pass through to the root. A `ref` reaches the root element.

### `columns` is a fixed count

Unlike `Grid`, where `cols` is a ceiling that collapses on narrow screens, `columns` here is exact. In a designer the column count is the content: "row 2, column 3" has to mean the same slot on the deal page, and Up / Down move by exactly one row. If you need fewer columns on small screens, pass a different number from your own breakpoint hook.

### Item state

`renderItem` receives `(item, state)`:

| Field | Description |
|---|---|
| `index` | 0-based index in the order shown (the live preview while dragging) |
| `position`, `row`, `column`, `total` | 1-based position, row and column, and the count |
| `dragging` | Being dragged with a pointer |
| `pickedUp` | Picked up with the keyboard |
| `dropTarget` | This slot is where the active item will land |
| `locked`, `disabled` | As passed |
| `handleProps` | Spread on an element to make it the drag handle |

## Pointer

Press a cell and move more than 4px to start dragging. A press without movement stays a click, so buttons and links inside cells still work. A press on a field, button or link inside a cell never starts a drag.

The dragged cell follows the pointer. The cell under the pointer is the target: the nearest cell wins, so a point in a gutter belongs to the closer neighbour. Releasing commits the move.

- **Release outside the grid to cancel.** While the pointer is outside, the preview shows the original order and the cell is dimmed.
- **Escape** cancels a drag in progress.
- The drag uses pointer capture (on the grid root), and text selection is off while dragging.
- **Auto-scroll:** dragging within 48px of the edge of the nearest scrolling container (or the window) scrolls it.

### Drag handles

By default the whole cell is the handle. To use a grip instead, spread `state.handleProps` on it, or put `data-reorderable-handle` on any element inside the cell. Once a cell contains a handle, only the handle starts a pointer drag.

```tsx
<ReorderableGrid
  items={fields}
  columns={3}
  renderItem={(field, state) => (
    <div className="flex items-start gap-2">
      <span {...state.handleProps} className="cursor-grab text-zinc-400" aria-hidden>
        ⠿
      </span>
      <div>{field.label}</div>
    </div>
  )}
/>
```

Cells have `touch-action: none`, so touch drags work. On a touch screen that also means a swipe that starts on a cell does not scroll the page.

## Keyboard

The grid is one tab stop (roving tabindex). With nothing picked up, the arrow keys move focus between cells in 2-D, and Home / End go to the first and last cell.

| Key | Picked up | Not picked up |
|---|---|---|
| Space / Enter | Drop here | Pick up the focused cell |
| ArrowLeft / ArrowRight | Move one slot | Move focus |
| ArrowUp / ArrowDown | Move one row | Move focus |
| Home / End | Move to the first / last free slot | Focus the first / last cell |
| Escape | Cancel and restore the original order | - |

ArrowDown from a row above a short last row lands on the last cell. Moves stop at the edges.

Escape goes through the kit's layer stack (`useEscapeKey`), so a picked-up cell inside a `Modal` or a full-screen surface cancels the pick-up first. The next Escape closes the Modal.

## Locked cells

`locked: true` pins a cell to its slot. The rule:

- A locked cell cannot be picked up or dragged. Trying announces "*Label* is locked and cannot be moved".
- Nothing can be dropped onto a locked slot. A pointer over one leaves the target where it was.
- Other cells flow around locked cells. A move happens among the free slots only, so every locked cell keeps its absolute index.
- Arrow keys skip pinned slots. Left / Right go on to the next free slot. Up / Down take the nearest free slot after the pinned one in reading order (forward for Down, backward for Up).

Locked cells render with a dashed border and a muted surface.

## `moveItem`

```ts
moveItem<T>(ids: readonly T[], fromIndex: number, toIndex: number, options?: { locked?: Iterable<T> | ((id: T) => boolean) }): T[]
```

The grid's reorder rule, without a DOM. It returns a new array and never mutates the input. `toIndex` is the index in the result.

```ts
moveItem(["a", "b", "c", "d"], 0, 3);                    // ["b", "c", "d", "a"]
moveItem(["a", "b", "c", "d", "e"], 0, 3, { locked: ["c"] }); // ["b", "d", "c", "a", "e"]
```

- An index outside the list, or one that is not an integer, throws `RangeError`.
- Moving a locked entry, or onto a locked slot, returns the order unchanged.

## Human+ (agent bridge)

The grid is controlled, its cells carry stable handles, and the reorder rule is a pure function, so an agent can drive it without scraping the DOM. No bridge ships yet. A `registerReorderableGridBridge` in agent-integrations would look like this:

```ts
registerReorderableGridBridge(server, {
  adapter: {
    list: () => fields.map((f, i) => ({ id: f.id, label: f.label, index: i, locked: !!f.locked })),
    setOrder: (ids) => setOrder(ids), // the same setter onReorder uses
  },
});
// grid_list  -> [{ id, label, index, row, column, locked }]
// grid_move  { id, toIndex } | { id, before } | { id, after }
//            -> moveItem(order, order.indexOf(id), toIndex, { locked }), then setOrder.
//            Returns the new order, or an error for a locked item or slot.
```

A host that wants agents to propose rather than apply can stage the `grid_move` result and apply it on a human confirm.

## Accessibility

- Each cell is `role="button"` with `aria-roledescription="reorderable item"`, `aria-pressed` while active, and `aria-describedby` pointing at the instructions. Locked cells and a disabled grid set `aria-disabled`.
- An `aria-live="assertive"` region announces each step. Default English messages:

| Event | Message |
|---|---|
| Pick-up | Picked up Amount at position 1 of 8, row 1 column 1. Arrow keys move it, Space or Enter drops it, Escape cancels |
| Move | Moved to position 3 of 8, row 1 column 3 |
| Drop | Dropped Amount at position 3 of 8, row 1 column 3 |
| Cancel | Cancelled. Amount returned to position 1 of 8, row 1 column 1 |
| Locked | Source is locked and cannot be moved |

Override any of them through `labels`. Each message is a function of `{ id, label, position, total, row, column }`. `instructions` and `roleDescription` are plain strings.

```tsx
<ReorderableGrid
  items={fields}
  columns={4}
  labels={{
    moved: (c) => `Position ${c.position} von ${c.total}, Zeile ${c.row} Spalte ${c.column}`,
    instructions: "Leertaste zum Aufnehmen, Pfeiltasten zum Verschieben, Escape zum Abbrechen.",
  }}
/>
```

- Focus stays on the moving cell while it moves, and it returns there after a drop or cancel.
- Cell motion is skipped under `prefers-reduced-motion: reduce`.

## Styling

Cells use the kit tokens (`--fancy-surface`, `--fancy-border`, `--fancy-text`, `--fancy-focus`, and their `-dark` pairs) with `dark:` variants. For `[data-theme="dark"]` as well as `.dark`, import `dark-variant.css` (see STYLE.md). The column count is a class, not an inline style. The only inline styles are transient: the dragged cell's transform and the other cells' shift animation, both cleared when the motion ends.

## Data attributes

| Selector | Element |
|---|---|
| `[data-react-fancy-reorderable-grid]` | Root. `data-columns`, `data-state` = `idle` / `dragging` / `picked-up`, `data-drop-index` while there is a target, `data-disabled` |
| `[data-react-fancy-reorderable-grid-item]` | A cell. `data-reorderable-id`, `data-index` (in the order shown), `data-state` = `idle` / `dragging` / `picked-up`, `data-locked="true"`, `data-drop-target` on the active cell when a release would land it |
| `[data-reorderable-handle]` | A drag handle you placed inside a cell |
| `[data-react-fancy-reorderable-grid-live]` | The `aria-live` region |

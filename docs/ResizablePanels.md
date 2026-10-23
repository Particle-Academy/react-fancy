# ResizablePanels

Two panels with a draggable, keyboard-operable separator between them. Follows the W3C [window splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/).

## Import

```tsx
import { ResizablePanels } from "@particle-academy/react-fancy";
// or the subpath
import { ResizablePanels } from "@particle-academy/react-fancy/resizable-panels";
```

## Basic Usage

```tsx
const [size, setSize] = useState(30);

<div className="h-96">
  <ResizablePanels
    value={size}
    onValueChange={setSize}
    onValueCommit={(v) => savePreference("sidebar", v)}
    min={15}
    max={60}
    label="Resize sidebar"
  >
    <nav>Sidebar</nav>
    <main>Content</main>
  </ResizablePanels>
</div>
```

The component fills its parent (`h-full w-full`); give the parent a size.

## Value

`value` is the **primary (first) panel's size as a percentage (0-100)** of the container. It is clamped to `min` / `max`, and `min` / `max` are themselves clamped to 0-100, so a panel can never be sized past the container.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Two children: the primary panel, then the secondary |
| `value` | `number` | - | Controlled primary size, a percentage |
| `defaultValue` | `number` | `50` | Uncontrolled starting size |
| `onValueChange` | `(value: number) => void` | - | Every change while dragging or pressing keys |
| `onValueCommit` | `(value: number) => void` | - | Once per gesture (pointer release / cancel, key release), only if the value changed. Persist here; the host owns persistence |
| `min` | `number` | `10` | Smallest primary size |
| `max` | `number` | `90` | Largest primary size |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Panel layout: side by side, or stacked |
| `step` | `number` | `5` | Arrow-key step, in percentage points |
| `largeStep` | `number` | `20` | Shift + Arrow step |
| `label` | `string` | `"Resize panels"` | Accessible name of the separator |
| `disabled` | `boolean` | `false` | Separator not focusable, ignores input |
| `className` | `string` | - | Classes on the root |

Other HTML attributes (including `data-*` handles) pass through to the root.

## Orientation and keys

`orientation` names how the **panels** are laid out:

| `orientation` | Panels | Separator `aria-orientation` | Keys |
|---|---|---|---|
| `"horizontal"` | side by side | `vertical` | ArrowLeft / ArrowRight |
| `"vertical"` | stacked | `horizontal` | ArrowUp / ArrowDown |

Shift + Arrow moves by `largeStep`. Home / End jump to `min` / `max`.

## Accessibility

The separator is `role="separator"`, `tabIndex=0`, with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-orientation`, `aria-label` and `aria-controls` pointing at the primary panel. It shows a focus ring from the `--fancy-focus` token. Pointer and touch drags use pointer capture (`touch-action: none` on the separator), and the separator has a 12px hit area around its 1px line.

## Data attributes

| Selector | Element |
|---|---|
| `[data-react-fancy-resizable-panels]` | Root; carries `data-orientation`, `data-dragging` while dragging, `data-disabled` |
| `[data-react-fancy-resizable-panels-panel="first"]` | Primary panel |
| `[data-react-fancy-resizable-panels-panel="second"]` | Secondary panel |
| `[data-react-fancy-resizable-panels-separator]` | The separator |

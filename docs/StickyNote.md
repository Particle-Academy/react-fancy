# StickyNote

A paper-styled sticky note with optional inline text editing. A presentational
primitive: it owns the note's look and editable text only — positioning,
dragging, resizing, and z-order are the consumer's responsibility. Shared by
`fancy-whiteboard` (`<Board>` items) and `fancy-artboard` (`<ArtBoard.Note>`).

## Import

```tsx
import { StickyNote } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
const [text, setText] = useState("Remember the milk");

<StickyNote value={text} onChange={setText} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | — | Note text (controlled) |
| defaultValue | `string` | `""` | Initial text when uncontrolled |
| onChange | `(text: string) => void` | — | Fires when edited text is committed (on blur) |
| color | `"yellow" \| "blue" \| "green" \| "pink" \| "violet"` \| any CSS color | `"yellow"` | Paper color — preset or arbitrary string |
| rotate | `number` | `0` | Rotation in degrees |
| width | `number \| string` | `180` | Width (px number or CSS length) |
| height | `number \| string` | `"auto"` | Height (px number or CSS length) |
| selected | `boolean` | `false` | Selected styling (focus ring) |
| editable | `boolean` | `true` | Allow inline editing of the text |
| autoFocus | `boolean` | `false` | Focus the editable region (caret at end) when it becomes editable |
| id | `string` | — | Stable handle; also emitted as the element `id` |
| children | `ReactNode` | — | Static content; overrides the editable text |

## Examples

### Tilted colored note

```tsx
<StickyNote value={text} onChange={setText} color="pink" rotate={-3} width={200} />
```

### Read-only note with custom paper color

```tsx
<StickyNote editable={false} color="#fde68a">
  Ship the release notes by Friday.
</StickyNote>
```

## Notes

- **Controlled text**: pass `value` + `onChange`; the editable region commits on blur. Press `Escape` to blur without further edits.
- **Stable handle**: pass `id` so agents/selectors can target a specific note (`data-react-fancy-sticky` is always present).
- **Positioning is yours**: wrap the note in your own draggable/absolutely-positioned container.

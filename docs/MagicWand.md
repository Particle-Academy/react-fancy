# MagicWand

Selection-anchored floating toolbar for text inputs. When the user highlights text in the wrapped `<Textarea>`, a small pill of AI quick-actions floats above the selection. Clicking an action runs a host callback whose return value replaces the highlighted text in-place.

Promoted from the dreaming sandbox on 2026-05-12.

## Import

```tsx
import { MagicWand, type MagicWandAction } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
const [body, setBody] = useState("…");

const actions: MagicWandAction[] = [
  {
    id: "rephrase",
    label: "Rephrase",
    hint: "same meaning, different words",
    run: async (selection) => await ai.rephrase(selection),
  },
  {
    id: "shorten",
    label: "Shorten",
    run: async (selection) => await ai.shorten(selection),
  },
];

<MagicWand value={body} onValueChange={setBody} actions={actions} />;
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | — | Controlled value, of the built-in textarea or of `target`. |
| onValueChange | `(v: string) => void` | — | Fires on every edit, and with an action's result. |
| actions | `MagicWandAction[]` | — | Action list. Each invokes a callback with the selection. |
| target | `RefObject<HTMLTextAreaElement \| HTMLInputElement> \| MagicWandTargetAdapter` | — | Act on a field or editor the host renders. MagicWand then renders no textarea, only the wand. See below. |
| appearance | `"floating" \| "pill"` | `"floating"` | `"pill"` is icon-only and compact. |
| autoHide | `boolean` | `true` | Hide the wand on click-away or scroll. |
| rows | `number` | `6` | Textarea rows. |
| placeholder | `string` | — | Textarea placeholder. |
| onAction | `(action, selection, replacement) => void` | — | Fires after an action successfully runs. |

## Acting on a field you own (`target`)

Pass a ref to your own textarea or input. MagicWand listens on it and floats the wand (portalled, viewport-positioned) over the selection; the result still arrives through `onValueChange`, so your `value` stays the one source of truth.

```tsx
const ref = useRef<HTMLTextAreaElement>(null);

<textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} />
<MagicWand target={ref} value={body} onValueChange={setBody} actions={actions} />
```

For anything that is not a textarea or input (a code editor, a contenteditable), pass an adapter. It is read-only: the write is `onValueChange`.

```tsx
<MagicWand
  target={{
    element: editorRef,                        // listened on for mouseup / keyup / select
    getSelection: () => editor.selection(),    // { start, end } offsets into `value`, or null
    getSelectionRect: () => editor.selectionRect(), // optional; default: top-centre of `element`
  }}
  value={code}
  onValueChange={setCode}
  actions={actions}
/>
```

## Action shape

```ts
type MagicWandAction = {
  id: string;
  label: string;
  hint?: string;
  tag?: string;
  run: (selection: string, range: { start: number; end: number; text: string }) => Promise<string> | string;
};
```

The string `run` returns becomes the replacement for the selected range. The wand patches `value` and emits `onAction`.

## Notes

- The toolbar position is computed by mirroring the textarea into a hidden div and measuring the selected substring's bounding rect — works for typical chat composers; less accurate for textareas that resize while the toolbar is open.
- In `"pill"` mode each action shows only the first character of its label, useful when toolbar real estate is tight.

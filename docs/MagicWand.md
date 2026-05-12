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
| value | `string` | — | Controlled textarea value. |
| onValueChange | `(v: string) => void` | — | Fires on every edit. |
| actions | `MagicWandAction[]` | — | Action list. Each invokes a callback with the selection. |
| appearance | `"floating" \| "pill"` | `"floating"` | `"pill"` is icon-only and compact. |
| autoHide | `boolean` | `true` | Hide the wand on click-away or scroll. |
| rows | `number` | `6` | Textarea rows. |
| placeholder | `string` | — | Textarea placeholder. |
| onAction | `(action, selection, replacement) => void` | — | Fires after an action successfully runs. |

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

# HotkeyCapture

Records a keyboard shortcut. Click it, or press Enter or Space on it, then press the combination. The value renders as key caps with [`Kbd`](../src/components/Kbd).

## Import

```tsx
import { HotkeyCapture } from "@particle-academy/react-fancy";
// or the subpath
import { HotkeyCapture, parseHotkey, formatHotkey } from "@particle-academy/react-fancy/hotkey-capture";
```

## Basic Usage

```tsx
const [shortcut, setShortcut] = useState("ctrl+k");

<HotkeyCapture label="Open command palette" value={shortcut} onChange={setShortcut} />
```

## The value

A normalised string: modifiers in the fixed order `ctrl`, `alt`, `shift`, `meta`, then exactly one key, all lower case. `""` means unset.

```
"ctrl+shift+k"   "alt+f5"   "meta+enter"   "shift+1"   "space"
```

A string rather than an object, because two equal shortcuts are then `===` equal, it stores in a settings row as-is, and an agent can read or write one directly. Letters and digits record the PHYSICAL key (`KeyboardEvent.code`), so Shift+1 is `shift+1`, not `!`, and an Option combination on a Mac records the letter rather than the symbol Option types.

Helpers:

| Helper | Does |
|------|------|
| `parseHotkey(value)` | `"Shift+Ctrl+K"` → `{ key: "k", ctrl: true, alt: false, shift: true, meta: false }`. Accepts `cmd`, `command`, `option`, `control`, `win`. `null` when empty or modifier-only. |
| `formatHotkey(combo)` | The object back to the normalised string. |
| `comboFromEvent(event)` | A `KeyboardEvent` to a combination, or `null` for a modifier alone. Match a live event with `formatHotkey(comboFromEvent(e)) === value`. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Controlled value (the normalised string) |
| `defaultValue` | `string` | `""` | Uncontrolled initial value |
| `onChange` | `(value: string) => void` | - | Called on a capture, or with `""` when cleared |
| `label` | `string` | `labels.label` | Accessible name |
| `clearable` | `boolean` | `true` | Show a clear button while a shortcut is set |
| `disabled` | `boolean` | `false` | |
| `name` | `string` | - | Form field name; a hidden input carries the value |
| `platform` | `"apple" \| "generic"` | detected after mount | Which modifier names to show. The server and first paint use `generic` |
| `size` | `"xs" \| "sm" \| "md"` | `"sm"` | Key cap size |
| `labels` | `HotkeyCaptureLabels` | see below | Every word, for translation |

Other props reach the root `<div>`.

### labels

| Key | Default |
|------|------|
| `label` | `"Keyboard shortcut"` |
| `empty` | `"Not set"` |
| `prompt` | `"Press the keys…"` |
| `captured` | `"Shortcut set to {combo}"` (announced) |
| `cancelled` | `"Cancelled"` (announced) |
| `cleared` | `"Shortcut cleared"` (announced) |
| `clear` | `"Clear shortcut"` (clear button's name) |
| `trigger` | `"{label}: {combo}"` (the trigger's accessible name) |
| `keys` | Cap names by modifier or key, merged over `Ctrl`, `Alt`, `Shift`, `Meta`, `Space`, `Up`, … (`⌘` and `Option` on Apple) |

## Behavior

- **Capture:** click, Enter or Space starts it; the trigger shows `labels.prompt` and `aria-pressed="true"`.
- **Modifiers alone do not commit.** Held modifiers show as caps beside the prompt; the first non-modifier key commits.
- **Escape cancels** and the previous value stays. Moving focus away cancels too. Nothing is written until a capture commits.
- While capturing, every key is claimed (`preventDefault` + `stopPropagation`), so page shortcuts and a parent modal's Escape do not fire.
- The result is announced in a polite live region.
- SSR-safe: no `window` or `navigator` during render.

## Stable handles

| Handle | On |
|------|------|
| `data-react-fancy-hotkey-capture` | Root, with `data-state="idle" \| "capturing"` and `data-value` (the normalised string) |
| `data-react-fancy-hotkey-capture-trigger` | The capture button |
| `data-react-fancy-hotkey-capture-clear` | The clear button |
| `data-react-fancy-hotkey-capture-status` | The polite live region |

An agent reads `data-value` and writes through the host's `value` / `onChange`; it never needs to synthesise key presses.

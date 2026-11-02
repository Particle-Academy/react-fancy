# CodeView

A lightweight, syntax-highlighted source view — a highlight overlay with a
transparent, auto-growing `<textarea>` on top. Built on the pure highlight
primitives in [`@particle-academy/fancy-file-commons`](https://www.npmjs.com/package/@particle-academy/fancy-file-commons)
(no CodeMirror, no heavy dependency). Powers the [`Editor`](./Editor.md)'s Source
view, and is usable standalone.

It highlights every grammar commons ships, case-insensitively — the same set as
[`CodeBlock`](./CodeBlock.md):

| Language | `language` values |
|---|---|
| TypeScript | `typescript`, `ts`, `tsx` |
| JavaScript | `javascript`, `js`, `jsx` |
| JSON | `json` (highlighted by the JavaScript grammar) |
| PHP | `php` |
| Python | `python`, `py` |
| Go | `go` |
| Markdown | `markdown`, `md` |
| Shell | `shell`, `sh`, `bash`, `zsh` |
| dotenv | `dotenv`, `env` |
| HTML / XML | `html`, `htm`, `xml`, `xhtml` |

Anything else, including `"plaintext"`, renders as plain text. The `Editor`'s
Source view passes `"html"` for HTML output and `"plaintext"` otherwise, so it is
unchanged. For a full IDE (line numbers, diff gutter), use
[`@particle-academy/fancy-code`](https://www.npmjs.com/package/@particle-academy/fancy-code)'s
`CodeEditor`.

## Import

```tsx
import { CodeView } from "@particle-academy/react-fancy";
```

## Usage

```tsx
const [src, setSrc] = useState("<p>Edit me</p>");

// In a sized box, `h-full` makes it fill the height.
<div className="h-80">
  <CodeView value={src} onChange={setSrc} language="html" className="h-full" />
</div>
```

Read-only (omit `onChange` or pass `readOnly`):

```tsx
<CodeView value={htmlString} language="html" readOnly />
```

## Filling height

`CodeView` has no baked-in height — pick the fill mechanism for your layout:

- **`h-full`** when the parent has a definite height (e.g. a sized box).
- **`flex-auto` + `min-h-0`** when it's a child of a flex column — it fills the
  free space when constrained and grows with content otherwise. (This is how the
  Editor's source view is wired.)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | — | Source text (controlled). |
| onChange | `(value: string) => void` | — | Called on edit. Omit for a read-only view. |
| language | `CodeLanguage` (any string) | `"plaintext"` | Language id or alias, case-insensitive (table above). Unknown values render plain. |
| readOnly | `boolean` | `false` | Read-only even if `onChange` is passed. |
| placeholder | `string` | — | Shown when empty. |
| minHeight | `number` | `120` | Min height (px) before growing with content. |
| maxHeight | `number` | — | Max height (px) before scrolling internally. |
| className | `string` | — | Classes on the scroll container (e.g. `h-full`, `flex-auto`). |

## Theme

The view resolves light/dark itself (the highlight colors are inlined). It
follows both the `.dark` class and the `prefers-color-scheme` media query, so it
matches whatever drives your Tailwind `dark:` variants.

# CodeBlock

A display-only code block: `<pre><code>`, syntax-highlighted where a grammar exists, with an optional copy button. Use it for install commands, config snippets and setup instructions.

It contains **no `textarea`, `input`, `select` or `contenteditable` element**, with or without the copy button, so it is safe on pages that must never accept input (for example a provider-setup page that must not accept credentials). The only interactive element is the copy `<button>`, and `copyable={false}` removes that too.

For an editable source surface use [`CodeView`](./CodeView.md); for a full multi-language editor use `@particle-academy/fancy-code`'s `CodeEditor`.

## Import

```tsx
import { CodeBlock } from "@particle-academy/react-fancy";
// or, just this component:
import { CodeBlock } from "@particle-academy/react-fancy/code-block";
```

## Basic Usage

```tsx
<CodeBlock code="npm install @particle-academy/react-fancy" language="bash" />
```

## With a filename header and line numbers

```tsx
<CodeBlock
  title=".env"
  language="env"
  showLineNumbers
  code={"OPENAI_API_KEY=your-key-here\nOPENAI_ORG=org-id"}
/>
```

With `title`, the copy button sits in the header with a visible "Copy" label. Without it, the button floats in the top-right corner of the code, icon-only until it shows its feedback.

## Highlighting

Every grammar `@particle-academy/fancy-file-commons` ships is highlighted, through its `tokenize(code, language)` lookup. `language` is case-insensitive:

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

**Any other language renders as plain, un-highlighted text** in the same font, size and palette, and nothing throws. `language` is reflected as `data-language` either way.

The colours are `CodeView`'s palette; the shell and dotenv grammars reuse its existing slots rather than adding new ones: shell flags (`-x`, `--flag`) and dotenv keys use the `attribute` colour, the command word uses `function`, and `$VAR` / `${VAR}` use `variable`.

## Props

Also accepts every `<div>` attribute (`id`, `aria-label`, `style`, `data-*`, ...), forwarded to the root element.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| code | `string` | - | The source to show. Rendered as text, never parsed as HTML |
| language | `CodeLanguage` (any string) | `"plaintext"` | Language id or alias, case-insensitive (see Highlighting). Unknown values are plain text |
| copyable | `boolean` | `true` | Show the copy button |
| title | `ReactNode` | - | Header above the code (a filename, or a label like "Terminal") |
| showLineNumbers | `boolean` | `false` | Number each line in a gutter that is not part of the code text |
| wrap | `boolean` | `false` | Wrap long lines instead of scrolling horizontally |
| copyLabels | `{ copy?, copied?, failed? }` | `"Copy code"`, `"Copied"`, `"Copy failed"` | Words on the copy button, for translation |
| onCopyCode | `(event: { text: string; ok: boolean }) => void` | - | Called after every copy attempt |
| className | `string` | - | Additional CSS classes on the root element |

## Copying

The button copies **exactly the `code` prop**: no highlight markup, no line numbers, no header text. It uses `navigator.clipboard.writeText`. When the Clipboard API is missing (server, insecure `http:` context, old browser) or the write is refused, nothing throws: the button shows "Copy failed" for two seconds, and `onCopyCode` receives `ok: false`. A successful copy shows "Copied" visibly, in the button's accessible name, and in a polite live region.

## Theming

The same palette as `CodeView` (`LIGHT_COLORS` / `DARK_COLORS` from `fancy-file-commons`), so the two sit together. Dark is chosen when `<html>` has the `dark` class or the OS prefers dark. On the server, and during hydration, the light palette is used, then the real theme.

## Security

Code is escaped before it reaches `dangerouslySetInnerHTML`: `highlightCode` escapes `&`, `<` and `>` in every slice it emits, highlighted or plain, and token colours pass an allow-list. `<script>` in `code` renders as the text `<script>`.

## Server rendering

No `window`, `document` or `navigator` access during render. Tested with `renderToString` with all three undefined.

## Agent handles

| Attribute | On | Value |
|-----------|----|-------|
| `data-react-fancy-code-block` | root `<div>` | - |
| `data-language` | root | the `language` prop |
| `data-wrap` | root | `true` / `false` |
| `data-react-fancy-code-block-header` / `-title` | the header and its title | only with `title` |
| `data-react-fancy-code-block-pre` / `-code` | the `<pre>` / `<code>` | - |
| `data-react-fancy-code-block-copy` | the copy `<button>` | - |
| `data-copy-state` | the copy `<button>` | `idle` / `copied` / `failed` |
| `data-react-fancy-code-block-line` | each line, with `showLineNumbers` | the line number |
| `data-react-fancy-code-block-line-number` / `-line-content` | each line's gutter / text | - |

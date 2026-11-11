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
| labels | `{ region? }` | the `title` when it is a string, else `"Code"` | Accessible name of the scrollable code region |
| onCopyCode | `(event: { text: string; ok: boolean }) => void` | - | Called after every copy attempt |

## Keyboard

The `<pre>` is a focusable region (`role="region"`, `tabIndex={0}`, named by `labels.region`), so a keyboard user can Tab to it and scroll a long line with the arrow keys. It shows an inset focus ring, which the rounded root cannot clip. The header title is painted in the palette's `foreground` colour, which reaches 4.5:1 on the header in both themes.
| className | `string` | - | Additional CSS classes on the root element |

## Copying

The button copies **exactly the `code` prop**: no highlight markup, no line numbers, no header text. It uses `navigator.clipboard.writeText`. When the Clipboard API is missing (server, insecure `http:` context, old browser) or the write is refused, nothing throws: the button shows "Copy failed" for two seconds, and `onCopyCode` receives `ok: false`. A successful copy shows "Copied" visibly, in the button's accessible name, and in a polite live region.

## Theming

The same palette as `CodeView` (`LIGHT_COLORS` / `DARK_COLORS` from `fancy-file-commons`), so the two sit together. **The markup carries both palettes and CSS picks one**, so server-rendered HTML is right in either theme and a dark site does not flash light on hydration:

- the root declares `--fc-<slot>-l` and `--fc-<slot>-d` (for example `--fc-keyword-l`, `--fc-keyword-d`), and everything coloured reads `var(--fc-<slot>, var(--fc-<slot>-l))`;
- the dark value applies under **your Tailwind `dark` variant** (the root's `dark:[--fc-<slot>:...]` classes, compiled from the `@source`d dist: class strategy, `dark-variant.css`, or Tailwind's default media query), **or** under a `.dark` / `[data-theme="dark"]` ancestor through `styles.css`, for a host that does not scan the package;
- with neither, it renders the light palette.

To change a colour, override its variable on the block: `style={{ "--fc-keyword-l": "#7c3aed", "--fc-keyword-d": "#a78bfa" }}`.

PHP is read as a **snippet**: code with no `<?php` open tag (`use Foo\Bar;`) is highlighted as PHP, and a `?>` switches to HTML. Code that opens with `<?php` highlights exactly as a file does.

## Security

Code is escaped before it reaches `dangerouslySetInnerHTML`: `highlightCodeWithVariables` escapes `&`, `<` and `>` in every slice it emits, highlighted or plain, and writes no colour value into the token markup; the palette values on the root pass `fancy-file-commons`' colour allow-list. `<script>` in `code` renders as the text `<script>`.

## Server rendering

No `window`, `document` or `navigator` access during render. Tested with `renderToString` with all three undefined. The server output is identical to the client's in both themes.

## Agent handles

| Attribute | On | Value |
|-----------|----|-------|
| `data-react-fancy-code-block` | root `<div>` | - |
| `data-language` | root | the `language` prop |
| `data-wrap` | root | `true` / `false` |
| `data-react-fancy-code-block-header` / `-title` | the header and its title | only with `title` |
| `data-react-fancy-code-block-pre` / `-code` | the `<pre>` (a focusable `role="region"`) / `<code>` | - |
| `data-react-fancy-code-block-copy` | the copy `<button>` | - |
| `data-copy-state` | the copy `<button>` | `idle` / `copied` / `failed` |
| `data-react-fancy-code-block-line` | each line, with `showLineNumbers` | the line number |
| `data-react-fancy-code-block-line-number` / `-line-content` | each line's gutter / text | - |

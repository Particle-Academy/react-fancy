# ContentRenderer

Renders HTML or Markdown strings as styled prose, with support for custom tag extensions.

## Import

```tsx
import { ContentRenderer } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<ContentRenderer value="<h1>Hello</h1><p>World</p>" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | - | HTML or Markdown string to render (required) |
| format | `"html" \| "markdown" \| "auto"` | `"auto"` | Content format. `"auto"` detects based on content |
| lineSpacing | `number` | `1.6` | Line height |
| extensions | `RenderExtension[]` | - | Per-instance render extensions (merged with global) |
| className | `string` | - | Additional CSS classes |
| unsafe | `boolean` | `false` | Skip HTML sanitization. See **Sanitization** below. |
| copyButtons | `boolean \| { code?: boolean; table?: boolean }` | `true` | Copy buttons on code blocks and tables. See **Copy buttons**. |
| onCopy | `(event: ContentCopyEvent) => void` | - | Called after every copy attempt, successful or not |
| clipboardWriter | `ContentClipboardWriter` | - | Host-supplied clipboard writer. See **Clipboard writer**. |
| streaming | `boolean` | `false` | The value is still arriving: hold back an unfinished trailing tag or fence. See **Streaming**. |

## Copy buttons

Every code block and table gets a react-fancy `Button` (icon `copy`, then
`check` for two seconds after a copy, `x` after a failure). What is copied:

- **Code**: exactly the code between the fences. No language label, no
  trailing newline added. (Marked itself drops trailing blank lines inside a
  fence, so they are not in the copy either; indentation, inner blank lines and
  characters like `<` and `&` are.)
- **Table**: TSV. A tab between cells, a newline between rows, no trailing
  newline. Tabs and line breaks inside a cell become spaces, so the shape
  survives a paste into a spreadsheet.

Each copy is announced as `Copied` or `Copy failed` through a polite
`aria-live` region (`[data-react-fancy-content-renderer-live]`).

```tsx
<ContentRenderer value={reply} copyButtons={false} />          // none
<ContentRenderer value={reply} copyButtons={{ table: false }} /> // code only
```

The button sits beside the block, never inside it, so its own text never ends
up in the copy. Buttons are added after mount, so server-rendered HTML has none
until hydration.

### Clipboard writer

The default writer puts **text/html and text/plain** on the clipboard with a
`ClipboardItem`, so a table pastes as a table into a rich editor and as cells
into a spreadsheet. If `ClipboardItem` is missing or that write is refused, it
falls back to `navigator.clipboard.writeText`.

`navigator.clipboard` can fail silently in some hosts (Genie found it does in a
sandboxed Electron window). Pass your own writer there:

```tsx
import { clipboard } from "electron";

<ContentRenderer
  value={reply}
  clipboardWriter={({ text, html }) => clipboard.write({ text, html })}
/>
```

A writer receives `{ kind, text, html }`. **Throwing, rejecting, or returning
`false` means the copy failed**, and so does a write that has not settled after
5 seconds. A failure is never silent: the button shows `x`, the live region says
`Copy failed`, and `onCopy` reports `ok: false`.

### Observing copies (Human+)

ContentRenderer is a read-only surface: it exposes stable DOM handles rather
than state. Copy follows that:

| Handle | On |
|--------|----|
| `data-react-fancy-content-copy="code" \| "table"` | the copy button |
| `data-copy-state="idle" \| "copied" \| "failed"` | the copy button |
| `data-react-fancy-content-copy-block="code" \| "table"` | the wrapper around the block |
| `data-react-fancy-content-renderer-live` | the live region |
| `data-streaming="true"` | the root, while `streaming` |

`onCopy` receives `{ kind, index, text, html, ok }`, where `index` is the
button's position among this renderer's copy buttons in document order. Wire it
to your activity feed if agents should see copies.

## Streaming

While a reply is still arriving, pass `streaming`:

```tsx
<ContentRenderer value={partial} streaming={!done} extensions={[resultTag]} />
```

Held back until it is complete:

- an opened tag of a **registered extension** with no closing tag yet, from its
  opening tag onwards (`<result>` + half a body, or `<result>body</res`);
- a partial tag at the very end that could still become one: `<`, `</`,
  `<res`, `<result title="Do`;
- an open code fence, from its fence line, and a fence marker still arriving
  (` `` `).

A `<` that cannot become a registered tag is prose and always renders
(`a < b`, `a<b`, `3 <= 4`), as do unknown tags and anything in inline code.
A lone `<` at the very end is held for one chunk, because it may be the start of
a tag. When `streaming` goes back to `false`, everything renders.

## Sanitization

Since v2.5.0, `ContentRenderer` sanitizes its rendered output by default:

- Strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, `<link>`, `<meta>`, `<base>`, `<form>`.
- Removes `on*` event-handler attributes (`onclick`, `onerror`, ...).
- Filters `href`, `src`, `action`, `formaction` to a safe-protocol allow-list (`http`, `https`, `mailto`, `tel`, `sms`, `ftp`, fragment, relative). `javascript:`, `data:`, `vbscript:` are dropped.

Pass `unsafe` to opt out — only do this when the input is fully trusted (e.g. your own CMS):

```tsx
<ContentRenderer value={trustedHtmlFromOurCMS} unsafe />
```

The helpers are also exported for use elsewhere:

```tsx
import { sanitizeHtml, sanitizeHref } from "@particle-academy/react-fancy";
```

> **Render extensions still need to sanitize their own input.** The `content` prop passed to your extension component is the raw text inside the matched tag — treat it as untrusted and call `sanitizeHtml(content)` if you render it as HTML. A `markdown` extension gets an already-sanitised `children` instead; use that.

## Render Extensions

Extensions let you define custom tags that are rendered by React components. Register globally or pass per-instance:

```tsx
import { registerExtension } from "@particle-academy/react-fancy";

import { sanitizeHtml } from "@particle-academy/react-fancy";

registerExtension({
  tag: "thinking",
  component: ({ content }) => (
    <details className="bg-zinc-100 p-3 rounded">
      <summary>Thinking...</summary>
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
    </details>
  ),
  block: true,
});

// Content with custom tags
<ContentRenderer value="<thinking>Some internal reasoning</thinking><p>Final answer.</p>" />
```

### RenderExtension

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| tag | `string` | - | Tag name to match (case-insensitive) |
| component | `ComponentType<RenderExtensionProps>` | - | React component to render the tag |
| block | `boolean` | `true` | Block-level (`<div>`) vs inline (`<span>`) wrapping |
| markdown | `boolean` | `false` | The body is markdown. See **Tags with a markdown body**. |

### RenderExtensionProps

| Prop | Type | Description |
|------|------|-------------|
| content | `string` | Inner content of the custom tag. Raw markdown for a `markdown` extension in markdown content. Untrusted. |
| attributes | `Record<string, string>` | Parsed attributes from the opening tag, with `on*`, `srcdoc` and unsafe URLs removed |
| children | `ReactNode` | `markdown` extensions only: the body, rendered and sanitised |

### Tags with a markdown body

Custom tags are normally found after the markdown has become HTML, and a
CommonMark HTML block keeps the markdown inside it as literal text, so
`<result>**done**</result>` would show its asterisks. Mark the extension
`markdown: true` and the tag is lifted out of the markdown **source** first:

```tsx
const resultTag: RenderExtension = {
  tag: "result",
  markdown: true,
  component: ({ attributes, children }) => (
    <Card>
      <Card.Header>{attributes.title}</Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  ),
};

<ContentRenderer
  value={'Here it is:\n\n<result title="Build">\n**Passed**, `12/12`\n\n- lint\n- test\n</result>'}
  extensions={[resultTag]}
/>
```

- `content` is the raw markdown body; `children` is that body rendered through
  the same pipeline as everything else: sanitised, with nested extensions and
  copy buttons. **Render `children`, not `content`.**
- A tag is lifted when its opening tag starts a line and it has a matching
  closing tag. Same-name nesting is balanced, other markdown tags nest inside
  it, and a tag inside a code fence or inline code is left alone.
- Anywhere else (mid-line, unclosed, or in HTML content) it is matched in the
  HTML as before, and `children` renders that HTML body.
- Nesting stops at depth 8: deeper bodies render as plain sanitised content.

Sanitisation is unchanged by lifting. Every piece of markdown, including each
body, is converted and then run through `sanitizeHtml` before it is injected,
and the tag's attributes lose `on*`, `srcdoc` and unsafe URLs before the
component sees them. Unknown tags stay in the markdown and are sanitised like
any HTML. `unsafe` turns all of this off, as it always has.

## Markdown Rendering

```tsx
<ContentRenderer value="# Title\n\nParagraph with **bold** text." format="markdown" />
```

## Markdown and sanitising without the component

`renderMarkdown(markdown, sanitize?)` returns the same HTML `ContentRenderer`
renders, already sanitised, so a host never imports the markdown parser itself.

`sanitizeHtml(html)` is a blocklist: it strips what can run (script, iframe,
event handlers, `javascript:` URLs, ...) and keeps the rest. Pass options and it
becomes an **allowlist** that keeps only what you list:

```ts
import { renderMarkdown, sanitizeHtml, type SanitizeHtmlOptions } from "@particle-academy/react-fancy";

const CHAT_PROSE: SanitizeHtmlOptions = {
  allowedTags: ["p", "br", "strong", "em", "a", "ul", "ol", "li", "code", "pre"],
  allowedAttributes: ["href", "title"],         // or { "*": ["title"], a: ["href"], span: ["data-*"] }
  allowedSchemes: ["https:", "http:", "mailto:"], // the default
  allowRelative: true,                           // /x, ../x, ?q, #frag; never //host. Default false
};

renderMarkdown(md, CHAT_PROSE);       // same as sanitizeHtml(renderMarkdown(md), CHAT_PROSE)
sanitizeHtml(html, CHAT_PROSE);
```

| Rule | Allowlist mode |
|------|----------------|
| Tag not listed | removed, its text and cleaned children kept |
| `script`, `style`, `iframe`, `frame(set)`, `object`, `embed`, `applet`, `link`, `meta`, `base`, `form`, `title`, `template`, `noscript`, `noembed`, `noframes`, `xmp`, `plaintext`, `svg`, `math` | removed WITH content, even when listed |
| Attribute not listed | removed |
| `on*`, `srcdoc`, `srcset` | removed, even when listed |
| URL attribute with an unlisted scheme | removed |
| `javascript:`, `vbscript:` | removed, even when listed |
| Comments | removed |
| No DOM (SSR) | input returned as escaped text (fails closed) |

The allowlist can only narrow: nothing you list widens past the blocklist.

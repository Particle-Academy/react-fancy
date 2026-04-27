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

> **Render extensions still need to sanitize their own input.** The `content` prop passed to your extension component is the raw text inside the matched tag — treat it as untrusted and call `sanitizeHtml(content)` if you render it as HTML.

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

### RenderExtensionProps

| Prop | Type | Description |
|------|------|-------------|
| content | `string` | Inner content of the custom tag |
| attributes | `Record<string, string>` | Parsed HTML attributes from the opening tag |

## Markdown Rendering

```tsx
<ContentRenderer value="# Title\n\nParagraph with **bold** text." format="markdown" />
```

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

## Render Extensions

Extensions let you define custom tags that are rendered by React components. Register globally or pass per-instance:

```tsx
import { registerExtension } from "@particle-academy/react-fancy";

registerExtension({
  tag: "thinking",
  component: ({ content }) => (
    <details className="bg-zinc-100 p-3 rounded">
      <summary>Thinking...</summary>
      <div dangerouslySetInnerHTML={{ __html: content }} />
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

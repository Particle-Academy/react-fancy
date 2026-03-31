# Editor

A rich text editor built on `contentEditable` with a configurable toolbar, HTML or Markdown output, and support for render extensions.

## Import

```tsx
import { Editor } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Editor defaultValue="<p>Hello world</p>" onChange={(html) => console.log(html)}>
  <Editor.Toolbar />
  <Editor.Content />
</Editor>
```

## Props

### Editor (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | - | Controlled content value |
| defaultValue | `string` | `""` | Default content (uncontrolled) |
| onChange | `(value: string) => void` | - | Callback when content changes |
| outputFormat | `"html" \| "markdown"` | `"html"` | Output format for the onChange value |
| lineSpacing | `number` | `1.6` | Line height for content area |
| placeholder | `string` | - | Placeholder text |
| extensions | `RenderExtension[]` | - | Per-instance render extensions (merged with global) |
| className | `string` | - | Additional CSS classes |

### Editor.Toolbar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| actions | `EditorAction[]` | - | Custom toolbar actions |
| onAction | `(command: string) => void` | - | Custom action handler |
| children | `ReactNode` | - | Custom toolbar content |
| className | `string` | - | Additional CSS classes |

#### EditorAction

| Field | Type | Description |
|-------|------|-------------|
| icon | `ReactNode` | Action icon element |
| label | `string` | Tooltip label |
| command | `string` | `document.execCommand` command name |
| commandArg | `string` | Optional command argument |
| active | `boolean` | Whether the action is currently active |

### Editor.Toolbar.Separator

A visual separator between toolbar groups. No props.

### Editor.Content

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | - | Additional CSS classes |

## Markdown Output

```tsx
<Editor outputFormat="markdown" onChange={(md) => console.log(md)}>
  <Editor.Toolbar />
  <Editor.Content />
</Editor>
```

## Custom Toolbar

```tsx
<Editor defaultValue="">
  <Editor.Toolbar>
    <button onClick={() => exec("bold")}>B</button>
    <Editor.Toolbar.Separator />
    <button onClick={() => exec("italic")}>I</button>
  </Editor.Toolbar>
  <Editor.Content />
</Editor>
```

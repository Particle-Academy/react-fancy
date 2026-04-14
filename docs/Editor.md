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
| maxHeight | `number` | - | Max height in px before scrolling. When set, the content area becomes scrollable. |

## Markdown Output

```tsx
<Editor outputFormat="markdown" onChange={(md) => console.log(md)}>
  <Editor.Toolbar />
  <Editor.Content />
</Editor>
```

## Scrollable Editor

Constrain the editor's height and let it scroll instead of growing the page:

```tsx
<Editor defaultValue={longHtml}>
  <Editor.Toolbar />
  <Editor.Content maxHeight={320} />
</Editor>
```

## useEditor Hook

Access editor state and commands from a child component (typically used inside a custom toolbar):

```tsx
import { useEditor } from "@particle-academy/react-fancy";

function CustomToolbarButtons() {
  const { exec } = useEditor();
  return (
    <>
      <button onClick={() => exec("bold")}>B</button>
      <Editor.Toolbar.Separator />
      <button onClick={() => exec("formatBlock", "h1")}>H1</button>
    </>
  );
}
```

### EditorContextValue

| Property | Type | Description |
|----------|------|-------------|
| exec | `(command: string, arg?: string) => void` | Execute a `document.execCommand`-style formatting command |
| insertText | `(text: string) => void` | Insert text at the current cursor position |
| wrapSelection | `(before: string, after: string) => void` | Wrap the selection with before/after strings |
| contentRef | `RefObject<HTMLDivElement \| null>` | Ref to the editable content element |
| outputFormat | `"html" \| "markdown"` | Current output format |
| lineSpacing | `number` | Current line spacing |
| placeholder | `string` | Current placeholder text |
| extensions | `RenderExtension[]` | Merged render extensions (global + instance) |

## Render Extensions

Render extensions let you embed custom React components inline using tag names you choose (e.g., `<alert>`, `<questions>`, `<thinking>`). The same extensions work in both `Editor` and `ContentRenderer`.

```tsx
import type { RenderExtension, RenderExtensionProps } from "@particle-academy/react-fancy";

function AlertRenderer({ content, attributes }: RenderExtensionProps) {
  const variant = attributes.type || "info";
  return <div className={`alert alert-${variant}`}>{content}</div>;
}

const extensions: RenderExtension[] = [
  { tag: "alert", component: AlertRenderer },
];

<Editor extensions={extensions} defaultValue='<alert type="info">Hello</alert>'>
  <Editor.Toolbar />
  <Editor.Content />
</Editor>
```

Register extensions globally with `registerExtension` (applies to all instances) or pass them per-instance via the `extensions` prop. Per-instance extensions are merged with global ones.

## Custom Toolbar

```tsx
<Editor defaultValue="">
  <Editor.Toolbar>
    <CustomToolbarButtons />
    <Editor.Toolbar.Separator />
    <MoreButtons />
  </Editor.Toolbar>
  <Editor.Content />
</Editor>
```

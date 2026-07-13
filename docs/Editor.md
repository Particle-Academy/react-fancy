# Editor

A rich text editor built on `contentEditable` with a configurable toolbar, HTML or Markdown output, a **Source** toggle for editing the raw markup, and support for render extensions.

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
| showSource | `boolean` | - | Controlled source-view flag. When `true`, the content area shows the raw `value` (in `outputFormat`) in an editable `<textarea>` |
| defaultShowSource | `boolean` | `false` | Initial source-view flag when uncontrolled |
| onShowSourceChange | `(showSource: boolean) => void` | - | Fired when the Source toggle (or an agent) flips source view on/off |
| className | `string` | - | Additional CSS classes |

### Editor.Toolbar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| actions | `EditorAction[]` | - | Custom toolbar actions |
| onAction | `(command: string) => void` | - | Custom action handler |
| children | `ReactNode` | - | Custom toolbar content |
| showSourceToggle | `boolean` | `true` | Append a Source toggle to the default toolbar. Ignored when `children` are supplied — custom toolbars compose their own `<Editor.SourceToggle />` |
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

### Editor.SourceToggle

A toolbar button that reveals the raw HTML/Markdown behind the editor. It is appended to the default toolbar automatically; add it to a **custom** toolbar wherever you like. Reads `showSource` / `setShowSource` from context.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| icon | `ReactNode` | `</>` | Toggle glyph/label |
| title | `string` | `"Source"` | Accessible title in rich-text mode (click → source) |
| activeTitle | `string` | `"Rich text"` | Accessible title in source mode (click → rich text) |
| className | `string` | - | Additional CSS classes |

### Editor.Content

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | - | Additional CSS classes |
| maxHeight | `number` | - | Max height in px before scrolling. When set, the content area becomes scrollable. |
| sourceClassName | `string` | - | Classes applied to the raw-source `<textarea>` shown while source mode is on |

## Markdown Output

```tsx
<Editor outputFormat="markdown" onChange={(md) => console.log(md)}>
  <Editor.Toolbar />
  <Editor.Content />
</Editor>
```

## Source View

The default toolbar includes a **Source** toggle (`</>`) on the right. Clicking it
swaps the rich-text surface for a `<textarea>` showing the raw markup — HTML when
`outputFormat="html"`, Markdown when `outputFormat="markdown"`. Edits made in the
textarea flow straight to `value`; toggling back re-renders the rich-text surface
from the edited source. Formatting buttons in the default toolbar are disabled
while source view is open.

```tsx
// Source toggle is on by default — nothing to wire up.
<Editor defaultValue="<p>Hello world</p>" outputFormat="html">
  <Editor.Toolbar />
  <Editor.Content />
</Editor>

// Opt out of the default toggle:
<Editor.Toolbar showSourceToggle={false} />
```

Drive it yourself (controlled), or drop the toggle into a custom toolbar:

```tsx
<Editor
  showSource={showSource}
  onShowSourceChange={setShowSource}
  defaultValue="<p>Hello</p>"
>
  <Editor.Toolbar>
    <CustomToolbarButtons />
    <Editor.SourceToggle className="ml-auto" />
  </Editor.Toolbar>
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
| showSource | `boolean` | Whether the raw-source view is showing instead of the rich-text surface |
| setShowSource | `(showSource: boolean) => void` | Toggle/set the raw-source view |

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

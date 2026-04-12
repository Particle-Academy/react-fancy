# TreeNav

Hierarchical tree navigation for file browsers, folder structures, and nested category lists. Supports expand/collapse, selection state, file/folder icons with extension-based coloring, and controlled/uncontrolled expanded node management.

Pairs with `@particle-academy/fancy-code`'s `CodeEditor` for IDE-style layouts.

## Import

```tsx
import { TreeNav } from "@particle-academy/react-fancy";
import type { TreeNodeData } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
const files: TreeNodeData[] = [
  {
    id: "src", label: "src", type: "folder", children: [
      { id: "app.tsx", label: "App.tsx", ext: "tsx" },
      { id: "main.ts", label: "main.ts", ext: "ts" },
      {
        id: "components", label: "components", type: "folder", children: [
          { id: "button.tsx", label: "Button.tsx", ext: "tsx" },
          { id: "modal.tsx", label: "Modal.tsx", ext: "tsx" },
        ],
      },
    ],
  },
  { id: "pkg", label: "package.json", ext: "json" },
  { id: "readme", label: "README.md", ext: "md" },
];

<TreeNav
  nodes={files}
  selectedId={selectedFile}
  onSelect={(id, node) => setSelectedFile(id)}
  defaultExpandedIds={["src"]}
/>
```

## Props

### TreeNav (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| nodes | `TreeNodeData[]` | - | Tree data (required) |
| selectedId | `string` | - | Currently selected node ID |
| onSelect | `(id: string, node: TreeNodeData) => void` | - | Selection callback |
| onNodeContextMenu | `(e: React.MouseEvent, node: TreeNodeData) => void` | - | Right-click callback per node |
| expandedIds | `string[]` | - | Controlled expanded node IDs |
| defaultExpandedIds | `string[]` | - | Initial expanded nodes (uncontrolled) |
| onExpandedChange | `(ids: string[]) => void` | - | Callback when expanded state changes |
| defaultExpandAll | `boolean` | `false` | Expand all folders on mount |
| indentSize | `number` | `16` | Indent per nesting level in px |
| showIcons | `boolean` | `true` | Show file/folder icons |
| className | `string` | - | Additional CSS classes |

### TreeNodeData

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| id | `string` | - | Unique identifier (required) |
| label | `string` | - | Display text (required) |
| type | `"file" \| "folder"` | - | Node type (auto-detected from children) |
| ext | `string` | - | File extension for icon coloring (e.g., `"ts"`, `"php"`) |
| children | `TreeNodeData[]` | - | Nested child nodes |
| icon | `ReactNode` | - | Custom icon override |
| disabled | `boolean` | - | Disable the node |

## Context Hook

Access tree state from custom components inside the tree:

```tsx
import { useTreeNav } from "@particle-academy/react-fancy";

function CustomNode() {
  const { selectedId, toggle, expandedIds } = useTreeNav();
  // ...
}
```

| Property | Type | Description |
|----------|------|-------------|
| selectedId | `string \| undefined` | Currently selected node ID |
| onSelect | `(id, node) => void` | Selection callback |
| expandedIds | `string[]` | Currently expanded node IDs |
| toggle | `(id: string) => void` | Toggle a node's expanded state |
| indentSize | `number` | Current indent size |
| showIcons | `boolean` | Whether icons are shown |

## Expand All

```tsx
<TreeNav nodes={files} defaultExpandAll />
```

## Controlled Expanded State

```tsx
const [expanded, setExpanded] = useState(["src", "components"]);

<TreeNav
  nodes={files}
  expandedIds={expanded}
  onExpandedChange={setExpanded}
/>
```

## No Icons

```tsx
<TreeNav nodes={files} showIcons={false} />
```

## Custom Indent

```tsx
<TreeNav nodes={files} indentSize={24} />
```

## File Icon Colors

Icons are automatically colored by file extension:

| Extension | Color |
|-----------|-------|
| `.ts`, `.tsx` | Blue (#3178c6) |
| `.js`, `.jsx` | Yellow (#f7df1e) |
| `.php` | Purple (#777bb4) |
| `.html`, `.htm` | Orange (#e34c26) |
| `.css` | Blue (#264de4) |
| `.json` | Gray (#a1a1aa) |
| `.md` | Gray (#71717a) |
| `.yaml`, `.yml` | Red (#cb171e) |

Override with the `icon` field on any node:

```tsx
{ id: "special", label: "config", icon: <GearIcon /> }
```

## Context Menu

Use `onNodeContextMenu` with the `ContextMenu` component to add right-click menus per node:

```tsx
import { TreeNav, ContextMenu } from "@particle-academy/react-fancy";

const [ctxNode, setCtxNode] = useState<TreeNodeData | null>(null);

<ContextMenu>
  <ContextMenu.Trigger>
    <TreeNav
      nodes={files}
      selectedId={selectedFile}
      onSelect={handleSelect}
      onNodeContextMenu={(e, node) => setCtxNode(node)}
    />
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    {ctxNode?.type === "folder" ? (
      <>
        <ContextMenu.Item>New File</ContextMenu.Item>
        <ContextMenu.Item>New Folder</ContextMenu.Item>
      </>
    ) : (
      <>
        <ContextMenu.Item onClick={() => openFile(ctxNode)}>
          Open File
        </ContextMenu.Item>
        <ContextMenu.Item onClick={() => copyName(ctxNode)}>
          Copy File Name
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item danger>Delete</ContextMenu.Item>
      </>
    )}
  </ContextMenu.Content>
</ContextMenu>
```

The `onNodeContextMenu` callback fires with the mouse event and the node data. Wrap TreeNav in `ContextMenu.Trigger` to let the ContextMenu handle positioning and open/close — the callback just tracks which node was right-clicked so you can render different menu items for files vs folders.

## IDE Layout Example

Pair with `@particle-academy/fancy-code` for a full IDE:

```tsx
import { TreeNav } from "@particle-academy/react-fancy";
import { CodeEditor } from "@particle-academy/fancy-code";

<div className="flex" style={{ height: 600 }}>
  <div className="w-56 shrink-0 overflow-y-auto border-r p-2">
    <TreeNav
      nodes={fileTree}
      selectedId={activeFile}
      onSelect={(id, node) => openFile(id, node)}
      defaultExpandedIds={["src"]}
      indentSize={12}
    />
  </div>
  <div className="flex-1">
    <CodeEditor value={code} onChange={setCode} language={lang}>
      <CodeEditor.Toolbar />
      <CodeEditor.Panel />
      <CodeEditor.StatusBar />
    </CodeEditor>
  </div>
</div>
```

## Data Attributes

| Attribute | Element |
|-----------|---------|
| `data-react-fancy-tree-nav` | Root nav element |
| `data-react-fancy-tree-node` | Each tree node wrapper |
| `data-react-fancy-tree-node-children` | Children container of an expanded node |

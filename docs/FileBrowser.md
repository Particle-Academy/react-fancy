# FileBrowser

Remote-capable file/folder browser + directory picker. Browses any tree the host can describe — local FS, HTTP, an MCP bridge, or a remote machine streaming snapshots — through two feeding modes that can be combined:

- **Provider mode (lazy pull):** supply `provider.loadChildren(path)`. Folders load on first expand with per-node loading and error states. The tree is never walked eagerly.
- **Snapshot mode (streamed push):** pass a JSON-friendly `snapshot` tree and replace/patch it as chunks arrive (relay / WebSocket / MCP). The snapshot is the source of truth for every path it covers; with a provider also present, unknown-depth folders stay lazily loadable (hybrid).

Fully controlled per the Human+ component contract; every row carries a `data-path` stable handle. Read-only in v1 — no content preview (pair with fancy-code's `FileViewer`) and no write operations.

## Import

```tsx
import { FileBrowser } from "@particle-academy/react-fancy";
import type { FileEntry, FileSnapshotNode } from "@particle-academy/react-fancy";
```

## Basic Usage — provider mode

Any async listing works. A fake in-memory FS:

```tsx
const FS: Record<string, FileEntry[]> = {
  "/": [
    { path: "/src", name: "src", kind: "dir", hasChildren: true },
    { path: "/package.json", name: "package.json", kind: "file", size: 1204, mtime: "2026-07-01T10:00:00Z" },
    { path: "/README.md", name: "README.md", kind: "file", size: 5310, mtime: "2026-06-28T09:30:00Z" },
  ],
  "/src": [
    { path: "/src/App.tsx", name: "App.tsx", kind: "file", size: 2048 },
    { path: "/src/components", name: "components", kind: "dir", hasChildren: true },
  ],
  "/src/components": [
    { path: "/src/components/Button.tsx", name: "Button.tsx", kind: "file", size: 980 },
  ],
};

const provider = {
  loadChildren: async (path: string) => {
    await new Promise((r) => setTimeout(r, 300)); // network latency
    const entries = FS[path];
    if (!entries) throw new Error(`No such directory: ${path}`);
    return entries;
  },
};

const [selected, setSelected] = useState<string | null>(null);

<FileBrowser
  provider={provider}
  value={selected}
  onChange={(value) => setSelected(value as string | null)}
  className="h-80"
/>
```

Each folder is fetched once, on first expand (or when it becomes the current directory). Failed loads show an inline error with a Retry button and fire `onError(path, error)`.

## Snapshot mode — streamed tree

Feed a JSON-friendly tree and update it from outside as chunks land. The component re-derives everything from the new value — selection, expansion, and current path survive because paths are the identity:

```tsx
const [tree, setTree] = useState<FileSnapshotNode[]>([
  { path: "/logs", name: "logs", kind: "dir" }, // children unknown so far
]);

// Later, as the remote machine pushes a chunk over your transport:
socket.on("fs-chunk", (chunk: FileSnapshotNode[]) => {
  setTree((prev) => mergeChunk(prev, chunk)); // host-side merge — any shape works
});

<FileBrowser snapshot={tree} select="file" className="h-80" />
```

- `children: []` marks a known-empty folder (no expand affordance, same as `hasChildren: false`); `children: undefined` marks unknown depth.
- Without a provider, unknown-depth folders are not expandable (there is nothing to load them with).
- **Hybrid:** pass `snapshot` *and* `provider` — the snapshot seeds instantly, the provider lazily fills folders the snapshot left unknown. Where the snapshot speaks, it wins.

## Directory picker

```tsx
const [dir, setDir] = useState<string | null>(null);

<Modal open={open} onClose={() => setOpen(false)}>
  <Modal.Header>Choose a folder</Modal.Header>
  <Modal.Body>
    <FileBrowser
      provider={provider}
      select="directory"
      value={dir}
      onChange={(value) => setDir(value as string | null)}
      defaultPath="/"
      className="h-72"
    />
  </Modal.Body>
  <Modal.Footer>
    <Button disabled={!dir} onClick={() => pick(dir!)}>Select {dir ?? "…"}</Button>
  </Modal.Footer>
</Modal>
```

With `select="directory"`, files stay visible and browsable but only folders are selectable. Double-click a folder (or use the path input) to drill into it.

## Multiple selection

```tsx
const [paths, setPaths] = useState<string[]>([]);

<FileBrowser
  provider={provider}
  select="both"
  multiple
  value={paths}
  onChange={(value) => setPaths(value as string[])}
/>
```

In `multiple` mode `value` is `string[]` and clicking (or Space) toggles membership. Disabled entries (`disabled: true`) can never be selected.

## Props

### FileBrowser (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| provider | `FileBrowserProvider` | - | Async data source — `loadChildren(path) => Promise<FileEntry[]>`, called lazily per folder |
| snapshot | `FileSnapshotNode[]` | - | JSON-friendly tree value, replaceable/patchable from outside; combinable with `provider` (hybrid) |
| select | `"file" \| "directory" \| "both"` | `"file"` | Which entry kinds are selectable |
| multiple | `boolean` | `false` | Multi-select; `value` becomes `string[]` |
| value | `string \| string[] \| null` | - | Controlled selection (paths) |
| defaultValue | `string \| string[] \| null` | - | Initial selection (uncontrolled) |
| onChange | `(value, entries: FileEntry[]) => void` | - | Selection callback (next value + matching known entries) |
| path | `string` | - | Controlled current directory |
| defaultPath | `string` | `"/"` | Initial current directory (uncontrolled) |
| onPathChange | `(path: string) => void` | - | Current-directory callback |
| expandedPaths | `string[]` | - | Controlled expanded folders |
| defaultExpandedPaths | `string[]` | - | Initially expanded folders (uncontrolled) |
| onExpandedChange | `(paths: string[]) => void` | - | Expanded-set callback |
| sort | `FileSort` | - | Controlled sort order |
| defaultSort | `FileSort` | `{ by: "name", direction: "asc" }` | Initial sort (uncontrolled) |
| onSortChange | `(sort: FileSort) => void` | - | Sort callback |
| filter | `string` | - | Controlled name filter (client-side, over loaded nodes) |
| defaultFilter | `string` | `""` | Initial filter (uncontrolled) |
| onFilterChange | `(filter: string) => void` | - | Filter callback |
| onError | `(path: string, error: unknown) => void` | - | Provider load failure callback |
| indentSize | `number` | `16` | Indent per nesting level in px |
| showIcons | `boolean` | `true` | Show file/folder icons |
| className | `string` | - | Extra classes on the outer shell |
| children | `ReactNode` | PathBar + Toolbar + Tree | Custom compound layout |

### FileEntry

| Field | Type | Description |
|-------|------|-------------|
| path | `string` | Stable identity — POSIX-style path (required) |
| name | `string` | Display name (required) |
| kind | `"file" \| "dir"` | Entry kind (required) |
| size | `number` | Bytes; shown on file rows and used by size sorting |
| mtime | `string` | ISO 8601 timestamp; used by mtime sorting |
| hasChildren | `boolean` | Dirs: `false` = known-empty (no chevron), `undefined` = unknown (loadable with a provider), `true` = has children |
| disabled | `boolean` | Dimmed; cannot be selected, expanded, or navigated into |

### FileSnapshotNode

`FileEntry` plus `children?: FileSnapshotNode[]` — `[]` = known-empty, `undefined` = unknown depth.

### FileSort

`{ by: "name" | "size" | "mtime"; direction: "asc" | "desc" }`. Directories always sort before files; ties break by name.

## Path bar

The breadcrumb trail navigates on click. The pencil button (or double-clicking the trail) switches to an editable path input: type a POSIX-style path and press **Enter** to navigate — in provider mode the target directory loads on arrival. **Escape** or blur cancels. Input is normalized (`\` → `/`, collapsed slashes, `.`/`..` resolved). Navigating clears the name filter.

## Keyboard navigation

The tree uses ARIA `tree`/`treeitem`/`group` semantics with a roving tabindex — one Tab stop for the whole tree.

| Key | Action |
|-----|--------|
| `↓` / `↑` | Move focus through visible rows |
| `→` | Expand a collapsed folder (lazy-loads it); on an expanded folder, move to its first child |
| `←` | Collapse an expanded folder; otherwise move focus to the parent row |
| `Home` / `End` | First / last visible row |
| `Enter` | Select (if selectable) and toggle a folder; on a non-selectable, non-expandable folder, navigate into it |
| `Space` | Toggle selection |

## Sorting and filtering

The toolbar sorts by **Name**, **Size**, or **Modified** (click the active field to flip direction — directories always list first) and filters by name. The filter is client-side over *loaded* nodes only: it never triggers loads, and a folder stays visible while it matches or any loaded descendant matches.

## Custom layout

The default layout is `PathBar + Toolbar + Tree`. Pass children to rearrange or omit chrome:

```tsx
<FileBrowser provider={provider} select="file" className="h-80">
  <FileBrowser.Toolbar filterPlaceholder="Search files" />
  <FileBrowser.Tree ariaLabel="Project files" />
  <FileBrowser.PathBar editable={false} />
</FileBrowser>
```

`useFileBrowser()` exposes the full context (entries, statuses, selection, navigation, sort/filter) for fully custom subcomponents.

## Agent bridge (Human+)

Every row carries `data-path` — paths are the stable handles agents target, never indexes. The controlled props (`value`, `path`, `expandedPaths`) plus the provider/snapshot contract are the full agent surface.

A `registerFilesBridge(server, { adapter })` ships later in `@particle-academy/agent-integrations`, exposing MCP tools over this surface — `files_list(path)`, `files_expand(path)` / `files_collapse(path)`, `files_select(paths)`, `files_navigate(path)`, `files_request_snapshot(path, depth)` — with each mutation emitting an `AgentActivity` event so presence, undo, and coaching layers compose for free.

## SSR

SSR-safe: no browser APIs outside event handlers, and rendering is deterministic (name sorting is pinned to a fixed locale so server and client order identically). In provider mode the server renders the loading state; hydration kicks off the first load.

## Data Attributes

| Attribute | Element |
|-----------|---------|
| `data-react-fancy-file-browser` | Root shell |
| `data-react-fancy-file-browser-path` | Path bar |
| `data-react-fancy-file-browser-path-segment` | Breadcrumb segment |
| `data-react-fancy-file-browser-path-input` | Editable path input |
| `data-react-fancy-file-browser-toolbar` | Toolbar |
| `data-react-fancy-file-browser-filter` | Name filter box |
| `data-react-fancy-file-browser-sort` | Sort control group (buttons carry `data-sort-field`) |
| `data-react-fancy-file-browser-tree` | Tree pane (`role="tree"`) |
| `data-react-fancy-file-browser-node` | Tree item (also carries `data-path` + `data-kind`) |
| `data-react-fancy-file-browser-row` | Visual row inside a tree item |
| `data-react-fancy-file-browser-node-children` | Children group of an expanded folder |
| `data-react-fancy-file-browser-status` | Loading / error / empty placeholder rows |

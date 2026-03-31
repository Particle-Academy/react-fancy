# Command

A command palette (Cmd+K style) with search input, grouped items, keyboard navigation, and focus trapping. Renders via a portal with backdrop.

## Import

```tsx
import { Command } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
const [open, setOpen] = useState(false);

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen(true);
    }
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, []);

<Command open={open} onClose={() => setOpen(false)}>
  <Command.Input placeholder="Search commands..." />
  <Command.List>
    <Command.Group heading="Actions">
      <Command.Item onSelect={() => console.log("new")}>New File</Command.Item>
      <Command.Item onSelect={() => console.log("open")}>Open File</Command.Item>
    </Command.Group>
    <Command.Group heading="Settings">
      <Command.Item onSelect={() => console.log("prefs")}>Preferences</Command.Item>
    </Command.Group>
    <Command.Empty>No results found.</Command.Empty>
  </Command.List>
</Command>
```

## Props

### Command (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | `boolean` | - | Whether the palette is visible (required) |
| onClose | `() => void` | - | Callback to close the palette (required) |
| className | `string` | - | Additional CSS classes |

### Command.Input

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| placeholder | `string` | - | Input placeholder text |
| className | `string` | - | Additional CSS classes |

### Command.List

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Groups and items |
| className | `string` | - | Additional CSS classes |

### Command.Group

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Group items |
| heading | `string` | - | Group heading label |
| className | `string` | - | Additional CSS classes |

### Command.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item content |
| value | `string` | - | Searchable value (defaults to text content) |
| onSelect | `() => void` | - | Callback when item is selected |
| className | `string` | - | Additional CSS classes |

### Command.Empty

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | `"No results found."` | Content shown when no items match |
| className | `string` | - | Additional CSS classes |

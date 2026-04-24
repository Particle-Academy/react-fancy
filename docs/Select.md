# Select

Dropdown select with two variants: a native `<select>` element and a custom listbox with search, creatable inputs, multi-select, and indicator support.

## Import

```tsx
import { Select } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Select
  label="Country"
  list={["USA", "Canada", "Mexico"]}
  placeholder="Choose a country"
/>
```

## Variants

- **`"native"`** (default for single-select) -- Renders a standard `<select>` element. Best for simple use cases and mobile.
- **`"listbox"`** (default when `multiple` is set) -- Renders a custom dropdown with keyboard navigation, optional search, and selection indicators.

The variant is auto-selected based on the `multiple` prop, or set it explicitly with `variant`.

## Props

Extends native `<select>` attributes (except `size`, `prefix`, `multiple`).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `list` | `InputOption[] \| InputOptionGroup[]` | **required** | Options as strings or `{ value, label, disabled?, description? }`. Groups via `{ label, options }`. |
| `variant` | `"native" \| "listbox"` | `"native"` (auto `"listbox"` if `multiple`) | Rendering variant |
| `placeholder` | `string` | `"Select..."` (listbox) | Placeholder text |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Controls sizing |
| `label` | `string` | - | Wraps in a `Field` with this label |
| `description` | `string` | - | Helper text below the select |
| `error` | `string` | - | Error message |
| `required` | `boolean` | `false` | Red asterisk on label |
| `dirty` | `boolean` | `false` | Amber ring |
| `disabled` | `boolean` | `false` | Disables the select |
| `onValueChange` | `(value: string) => void` | - | Callback for single-select value changes |
| **Listbox-only props** | | | |
| `multiple` | `boolean` | `false` | Enable multi-select (forces listbox variant) |
| `values` | `string[]` | - | Controlled multi-select values |
| `defaultValues` | `string[]` | - | Default multi-select values (uncontrolled) |
| `onValuesChange` | `(values: string[]) => void` | - | Callback for multi-select changes |
| `searchable` | `boolean` | `false` | Show search/filter input in the dropdown |
| `creatable` | `boolean` | `false` | Show a text input that accepts new values not already in `list`. Implies a text input. |
| `onCreate` | `(label: string) => void` | - | Fires when a new option is created from user input |
| `createLabel` | `string` | `"Create"` | Prefix for the "Create X" affordance |
| `selectedSuffix` | `string` | `"selected"` | Suffix for the count display (e.g. "3 selected") |
| `indicator` | `"check" \| "checkbox"` | `"check"` | Selection indicator style |
| `prefix` | `ReactNode` | - | Affix before the select |
| `suffix` | `ReactNode` | - | Affix after the select |

### InputOption type

```ts
type InputOption = string | { value: string; label: string; disabled?: boolean; description?: string };
```

### InputOptionGroup type

```ts
type InputOptionGroup = { label: string; options: InputOption[] };
```

## Examples

### Native with option objects

```tsx
<Select
  label="Role"
  list={[
    { value: "admin", label: "Administrator" },
    { value: "editor", label: "Editor" },
    { value: "viewer", label: "Viewer", disabled: true },
  ]}
  onValueChange={(role) => console.log(role)}
/>
```

### Listbox with search

```tsx
<Select
  variant="listbox"
  label="Framework"
  searchable
  list={["React", "Vue", "Angular", "Svelte", "Solid"]}
  onValueChange={setFramework}
/>
```

### Multi-select with checkbox indicator

```tsx
const [selected, setSelected] = useState<string[]>([]);

<Select
  label="Toppings"
  multiple
  searchable
  indicator="checkbox"
  list={["Pepperoni", "Mushrooms", "Onions", "Olives", "Peppers"]}
  values={selected}
  onValuesChange={setSelected}
/>
```

### Option groups (native)

```tsx
<Select
  label="Vehicle"
  list={[
    { label: "Cars", options: ["Sedan", "SUV", "Truck"] },
    { label: "Bikes", options: ["Sport", "Cruiser"] },
  ]}
/>
```

### Creatable listbox

Add new values by typing. Works with both single and multi-select. The dropdown's text input doubles as a search input, so typing filters existing options and shows a `+ Create "…"` row when no exact match exists. Press Enter or click the row to commit.

```tsx
// Single-select: closes after creating
<Select
  variant="listbox"
  creatable
  label="Category"
  list={categories}
  value={value}
  onValueChange={setValue}
/>

// Multi-select (tag-input pattern): keeps the dropdown open for more additions
<Select
  multiple
  creatable
  label="Tags"
  list={tags}
  values={selectedTags}
  onValuesChange={setSelectedTags}
  onCreate={(label) => console.log("created", label)}
/>
```

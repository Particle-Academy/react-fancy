# Autocomplete

Text input with a filterable dropdown of suggestions, supporting async search and keyboard navigation.

## Import

```tsx
import { Autocomplete } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Autocomplete
  options={[
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" },
    { value: "angular", label: "Angular" },
  ]}
  placeholder="Search frameworks..."
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `AutocompleteOption[]` | **required** | `{ value: string; label: string; disabled?: boolean }` |
| `value` | `string` | - | Controlled selected value |
| `defaultValue` | `string` | `""` | Default value (uncontrolled) |
| `onChange` | `(value: string) => void` | - | Callback when an option is selected |
| `onSearch` | `(query: string) => void` | - | Callback fired as the user types (for async fetching) |
| `placeholder` | `string` | - | Input placeholder |
| `loading` | `boolean` | `false` | Show a loading indicator in the dropdown |
| `emptyMessage` | `ReactNode` | `"No results found."` | Message when no options match |
| `disabled` | `boolean` | `false` | Disables the input |
| `className` | `string` | - | Additional CSS classes |

Matching text in dropdown options is automatically highlighted in bold.

## Examples

### Async search

```tsx
const [options, setOptions] = useState([]);
const [loading, setLoading] = useState(false);

<Autocomplete
  options={options}
  loading={loading}
  placeholder="Search users..."
  onSearch={async (query) => {
    setLoading(true);
    const results = await fetchUsers(query);
    setOptions(results.map((u) => ({ value: u.id, label: u.name })));
    setLoading(false);
  }}
  onChange={(userId) => console.log("Selected:", userId)}
/>
```

### Controlled

```tsx
const [city, setCity] = useState("");

<Autocomplete
  options={cities}
  value={city}
  onChange={setCity}
  placeholder="Pick a city"
/>
```

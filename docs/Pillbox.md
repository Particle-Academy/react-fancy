# Pillbox

Tag/pill input that lets users type free-text values and manage them as removable pills.

## Import

```tsx
import { Pillbox } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Pillbox placeholder="Add tags..." onChange={(tags) => console.log(tags)} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string[]` | - | Controlled list of items |
| `defaultValue` | `string[]` | `[]` | Default items (uncontrolled) |
| `onChange` | `(values: string[]) => void` | - | Callback when items change |
| `placeholder` | `string` | `"Type and press Enter..."` | Placeholder (shown only when no items exist) |
| `maxItems` | `number` | - | Maximum number of items allowed |
| `disabled` | `boolean` | `false` | Disables input and removal |
| `className` | `string` | - | Additional CSS classes |

**Behavior:**
- Press **Enter** to add the current text as a pill. Duplicates and empty strings are ignored.
- Press **Backspace** on an empty input to remove the last pill.
- Click the **X** on any pill to remove it.

## Examples

### With max items

```tsx
<Pillbox
  placeholder="Add up to 5 skills..."
  maxItems={5}
  defaultValue={["React", "TypeScript"]}
  onChange={setSkills}
/>
```

### Controlled

```tsx
const [emails, setEmails] = useState<string[]>([]);

<Pillbox value={emails} onChange={setEmails} placeholder="Add email addresses..." />
```

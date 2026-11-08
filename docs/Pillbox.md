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
| `label` | `string` | - | Names the text input (rendered with the shared `Field` wrapper) |
| `labelHidden` | `boolean` | `false` | Keep the label for screen readers, but do not draw it |
| `description` | `string` | - | Help text, linked to the input with `aria-describedby` |
| `error` | `string` | - | Validation message, linked with `aria-describedby`; sets `aria-invalid` |
| `required` | `boolean` | - | Shows the required mark and sets `aria-required` (not native `required`: the entry box is empty when the value is complete) |
| `id` | `string` | auto | `id` of the text input |
| `labels` | `PillboxLabels` | - | Words read to screen readers, for translation: `remove` (`"Remove {tag}"`), `added` (`"Added {tag}"`), `removed` (`"Removed {tag}"`) |

**Behavior:**
- Press **Enter** to add the current text as a pill. Duplicates and empty strings are ignored.
- Press **Backspace** on an empty input to remove the last pill.
- Click the **X** on any pill to remove it.
- Adding and removing a pill is announced in a polite live region.

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

### Labelled, with validation

```tsx
<Pillbox
  label="Skills"
  description="Press Enter after each one"
  error={skills.length === 0 ? "Add at least one skill" : undefined}
  required
  value={skills}
  onChange={setSkills}
/>
```

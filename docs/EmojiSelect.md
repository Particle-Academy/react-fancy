# EmojiSelect

A dropdown picker for selecting an emoji, with search filtering and category grouping.

## Import

```tsx
import { EmojiSelect } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<EmojiSelect onChange={(emoji) => console.log(emoji)} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | - | Controlled selected emoji character |
| defaultValue | `string` | `""` | Default selected emoji (uncontrolled) |
| onChange | `(emoji: string) => void` | - | Callback when an emoji is selected |
| placeholder | `string` | `"Search emojis..."` | Search input placeholder text |
| className | `string` | - | Additional CSS classes |

Supports both controlled (`value` + `onChange`) and uncontrolled (`defaultValue`) usage.

## Examples

### Controlled

```tsx
const [emoji, setEmoji] = useState("");

<EmojiSelect value={emoji} onChange={setEmoji} />
```

### With custom placeholder

```tsx
<EmojiSelect
  defaultValue="🎉"
  placeholder="Find an emoji..."
  onChange={(e) => console.log("Selected:", e)}
/>
```

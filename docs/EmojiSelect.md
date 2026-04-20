# EmojiSelect

A dropdown picker for selecting an emoji, with search filtering, 9-category tabs (full Unicode 15.1 set), and skin-tone support via hover (desktop) or long-press (mobile).

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

## Features

- **1,897 base emojis** across 9 Unicode 15.1 categories (Smileys, People, Animals, Food, Travel, Activities, Objects, Symbols, Flags)
- **Skin tone picker**: 299 tonable emojis show a small amber dot. On desktop, hover for ~120ms to open a floating 6-swatch row (neutral + 5 tones). On mobile, long-press (400ms). Selected tone is saved to `localStorage` and auto-applied on future loads.
- **Search**: type to filter across all categories by name
- **Category tabs**: click icons to browse by category
- **Keyboard**: type to search immediately after opening

## Skin Tone Persistence

The last-selected skin tone is stored in `localStorage` under the key `fancy:emoji-tone`. All tonable emojis render with the preferred tone by default. Clear `localStorage` to reset to neutral (yellow).

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

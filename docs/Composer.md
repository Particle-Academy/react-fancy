# Composer

A chat-style message input with auto-growing textarea, Enter-to-submit, action slot, and controlled/uncontrolled value.

## Import

```tsx
import { Composer } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Composer
  onSubmit={(message) => console.log("Sent:", message)}
  placeholder="Type a message..."
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | - | Controlled input value |
| defaultValue | `string` | `""` | Default value (uncontrolled) |
| onChange | `(value: string) => void` | - | Callback on input change |
| onSubmit | `(value: string) => void` | - | Callback when Enter is pressed (without Shift) |
| placeholder | `string` | `"Type a message..."` | Textarea placeholder |
| actions | `ReactNode` | - | Custom action buttons rendered in the bottom toolbar |
| disabled | `boolean` | `false` | Disable input and submit |
| className | `string` | - | Additional CSS classes |

## With Actions

```tsx
<Composer
  onSubmit={handleSend}
  actions={
    <>
      <button onClick={handleAttach}>Attach</button>
      <button onClick={handleEmoji}>Emoji</button>
    </>
  }
/>
```

## Controlled

```tsx
const [message, setMessage] = useState("");

<Composer
  value={message}
  onChange={setMessage}
  onSubmit={(val) => {
    sendMessage(val);
    setMessage("");
  }}
/>
```

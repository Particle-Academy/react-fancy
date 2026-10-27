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
| onSubmit | `(value, extras) => void \| Promise<SubmitResult>` | - | Called on Enter (without Shift, and not while an IME composition is being confirmed) or the send button. Return a Promise to hold the message until the send is acknowledged; see [Acknowledged send](#acknowledged-send) |
| onSubmitError | `(error: unknown) => void` | - | Called when a Promise from `onSubmit` rejects (with the reason) or resolves `{ ok: false }` (with its `error`). The message is kept |
| placeholder | `string` | `"Type a message..."` | Textarea placeholder |
| actions | `ReactNode` | - | Custom action buttons rendered in the bottom toolbar |
| disabled | `boolean` | `false` | Disable the text, the pills and the send |
| sendDisabled | `boolean` | `false` | Disable only the send. The text stays editable; Enter does not send |
| name | `string` | - | Form field name for the text. On the textarea; with `pastePlacement="inline"`, on a hidden input carrying the expanded text |
| inputId | `string` | - | `id` of the text field, in either placement |
| className | `string` | - | Additional CSS classes |

## Acknowledged send

Return a Promise from `onSubmit` and the message stays until the send is
acknowledged. While it is pending the send button is disabled and
`aria-busy`, a second send is refused, and the root carries
`data-submit-state="submitting"`. The text stays editable.

- **Resolves** (to anything but `{ ok: false }`): the message clears, exactly
  as a void `onSubmit` clears it. If the person edited the message while the
  send was in flight, their newer text is kept rather than discarded.
- **Rejects, or resolves `{ ok: false, error? }`**: the text and held pastes
  are kept, `onSubmitError` is called, the root carries
  `data-submit-state="error"`, and a visually hidden `role="alert"`
  (`[data-react-fancy-composer-error]`) announces the failure. The next send
  clears it.

```tsx
<Composer
  name="message"
  inputId="chat-message"
  sendDisabled={agentIsAnswering}
  onSubmit={async (text) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { ok: false, error: "The server did not accept it." };
  }}
  onSubmitError={(error) => toast.error(String(error ?? "Message not sent"))}
/>
```

A void `onSubmit` behaves exactly as it always has: the message clears at once.
An `onSubmit` that was ALREADY `async` now waits for its Promise before
clearing, and keeps the message if it rejects.

**Controlled `value`:** the clear is an `onChange("")` like any other, so the
host still decides. Clearing the value yourself inside `onSubmit` also still
works; with an async send, clear it after the `await` so a failure keeps it.

**Why the text stays editable while sending:** the person can start the next
message, and nothing they type is lost — only the draft that was sent is
cleared. Locking the field would buy nothing: the sent text is already in
flight, so editing it cannot change what was sent.

## Stable handles

| Selector | What |
|----------|------|
| `[data-react-fancy-composer]` | Root. `data-submit-state` is `submitting` or `error` when not idle |
| `[data-react-fancy-composer-textarea]` | The text field, default placement |
| `[data-react-fancy-composer-input]` | The text field, `pastePlacement="inline"` (a contenteditable) |
| `#<inputId>` | The text field, either placement |
| `[data-react-fancy-composer-send]` | The send button |
| `[data-react-fancy-composer-error]` | The failure announcement, while there is one |

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

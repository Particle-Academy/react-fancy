# ChatThread

A controlled message list for agent and support conversations: chat with an
agent in a side panel, a ticket thread with internal notes, an admin chat whose
agent drafts proposals for a human to approve. `ChatMessage` is the single
message, usable on its own.

Added in `5.71.0`.

## Import

```tsx
import { ChatThread, ChatMessage } from "@particle-academy/react-fancy";
// or the subpath
import { ChatThread } from "@particle-academy/react-fancy/chat-thread";
```

## Basic usage

```tsx
const [messages, setMessages] = useState<ChatMessageData[]>([]);

<ChatThread
  className="h-full"
  messages={messages}
  composer={
    <Composer
      onSubmit={async (text) => {
        const res = await send(text); // the server appends the message
        if (!res.ok) return { ok: false, error: res.error };
      }}
    />
  }
/>
```

The thread renders exactly `messages`, oldest first. It owns no message state.
It does not ship an input: put `Composer` or `PromptInput` in the `composer`
slot. Both have acknowledged send (5.70.0), so the draft stays until your
`onSubmit` Promise resolves.

## Messages are JSON

```ts
interface ChatMessageData {
  id: string;                      // data-chat-message
  role: "user" | "assistant" | "system" | "agent" | "staff" | "customer" | string;
  author?: { name: string; avatar?: string };
  content: string;                 // markdown, always sanitised
  format?: "markdown" | "text";    // "text" renders literally
  createdAt: string | number;      // ISO 8601 or epoch ms
  status?: "pending" | "streaming" | "sent" | "failed";   // default "sent"
  visibility?: "public" | "internal";                      // default "public"
  attachments?: { id: string; name: string; url?: string; mimeType?: string; size?: number }[];
  proposal?: { id: string; title?: string; state?: "pending" | "accepted" | "rejected" | "withdrawn";
               acceptLabel?: string; rejectLabel?: string };
  own?: boolean;                   // default: ownRoles.includes(role)
  meta?: Record<string, unknown>;  // carried, never rendered
}
```

- **Content** goes through `ContentRenderer` with sanitisation on. There is no
  `unsafe` prop on the thread, on purpose: message bodies are text the host did
  not author. `contentOptions` passes `extensions`, `copyButtons`, `onCopy`,
  `clipboardWriter` and `lineSpacing` through.
- **Streaming.** A message with `status: "streaming"` renders with
  `ContentRenderer`'s `streaming`: by default an unfinished code fence or tag is
  held back until it closes. `streaming="progressive"` on the thread shows it
  as it fills. The message is `aria-busy` while it streams, so screen readers
  are not read every token. Set the status to `"sent"` when the stream ends.
- **Roles.** The six named roles get default labels. Any other string is
  carried verbatim on `data-chat-role` and rendered neutrally. `system` renders
  as a centred line.
- **Own messages** align to the end. `ownRoles` (default `["user"]`) decides
  which; `own` on a message overrides it. A support staff view passes
  `ownRoles={["staff"]}`, or sets `own` per message to distinguish colleagues.
- **Attachments** render as links (unsafe schemes render the name without a
  link). They are never loaded inline. `renderAttachment` replaces one.

## Internal notes

`visibility: "internal"` renders a dashed amber bubble with a visible
"Internal note" label (`[data-chat-internal-label]`) on every internal message.

**The thread never decides visibility.** It renders exactly what it is given.
Filter on the server (and in the transformer) and pass only what this viewer
may see. A component that hid internal notes itself would be a second policy
nobody tests.

## Proposals (approval cards)

A message with a `proposal` is an agent's suggested action awaiting a human: a
drafted reply, a field change, a page edit. Its `content` is the draft.

```tsx
<ChatThread
  messages={messages}
  onProposalAccept={(m) => api.decide(m.proposal!.id, "accept", m.meta?.version)}
  onProposalReject={(m) => openRejectReasonDialog(m)}
/>
```

- Stable handle `[data-chat-proposal="<proposal id>"]` with
  `data-chat-proposal-state`; buttons are
  `[data-chat-proposal-action="accept" | "reject"]`.
- **It never acts on its own.** Nothing is called on render. The state is the
  host's: buttons show only while `state` is `"pending"` (the default) and only
  for the callbacks you pass. When the host moves the card to `accepted`,
  `rejected` or `withdrawn`, the buttons are replaced by a status badge.
- **Acknowledged.** Return a Promise and both buttons are disabled
  (`aria-busy`) until it settles; a second decision is refused even within the
  same event batch. A rejection goes to `onActionError(error, action)`; without
  it the rejection is left unhandled so it still reaches the console.
- "Edit then approve" and "reject with a reason" are host UI: open your editor
  or dialog from the callback, or from the actions slot.

## Scrolling: stick to the bottom without yanking

- The thread starts at the bottom and follows new messages, and a streaming
  message as it grows, **only while the reader is at the bottom**
  (`bottomThreshold`, default 48px).
- A reader who scrolled up stays exactly where they are. An
  "N new messages" control (`[data-react-fancy-chat-thread-jump]`,
  `data-unseen`) appears; it jumps to the latest and moves focus to the log.
- The viewer's own new message (see `ownRoles`) always scrolls into view.
- Prepending earlier messages keeps the message under the reader in place.
- **Only the log's own `scrollTop` is ever set.** The thread never calls
  `scrollIntoView`, and it focuses with `{ preventScroll: true }`, so no
  ancestor and never the page scrolls (the rule `PromptInput` adopted in 5.69.0
  for genie#1290).
- `stickToBottom={false}` turns following off entirely.
- `onAtBottomChange(atBottom)` reports the reader arriving at or leaving the
  bottom.

### Imperative handle

```tsx
const thread = useRef<ChatThreadHandle>(null);
<ChatThread ref={thread} messages={messages} />;

thread.current?.scrollToLatest();
thread.current?.scrollToMessage("msg_42"); // false if not rendered
thread.current?.element;                   // the log element
```

## Load earlier

```tsx
<ChatThread
  messages={messages}
  hasEarlier={cursor !== null}
  onLoadEarlier={async () => {
    const page = await api.history(cursor);
    setMessages((m) => [...page.items, ...m]);
    setCursor(page.next);
  }}
/>
```

The control shows while `onLoadEarlier` is set and `hasEarlier` is not
`false`. A returned Promise disables it until it settles; `loadingEarlier`
drives the same state from the host.

## Day separators and grouping

```tsx
<ChatThread messages={messages} separators="day" groupConsecutive />
```

- `separators="day"` inserts `[data-chat-day-separator="YYYY-MM-DD"]` at each
  local calendar-day change. `formatDay` formats the label.
- `groupConsecutive` merges consecutive messages from the same role and author
  within 5 minutes (or pass a window in ms): the header and avatar show once
  and later messages carry `data-chat-grouped`. Internal and public messages
  never merge, and neither do proposals or system lines.

## Per-message actions

```tsx
<ChatThread
  messages={messages}
  renderActions={(m) =>
    m.role === "assistant" ? (
      <Button size="xs" variant="ghost" icon="copy" onClick={() => copy(m.content)}>Copy</Button>
    ) : m.status === "failed" ? (
      <Button size="xs" variant="ghost" onClick={() => retry(m)}>Retry</Button>
    ) : null
  }
/>
```

The slot renders in `[data-chat-message-actions]`; return `null` for none.

## Human+

- **Controlled.** `messages` is the state. Loading history and deciding a
  proposal are callbacks; the thread holds only view state (scroll position,
  the unseen count).
- **Stable handles.** `data-react-fancy-chat-thread`,
  `data-chat-message="<id>"` with `data-chat-role`, `data-chat-status`,
  `data-chat-visibility`, and `data-chat-proposal="<id>"`.
- **Observable activity.** `onActivity` receives every interaction:

  ```ts
  type ChatThreadActivity =
    | { type: "load-earlier" }
    | { type: "proposal-accept"; messageId: string; proposalId: string }
    | { type: "proposal-reject"; messageId: string; proposalId: string }
    | { type: "jump-to-latest"; unseen: number };
  ```

  Map it onto fancy-auto-common's `AutoActivityEvent` in the host, as with
  `JsonEditor`'s `onActivity`.
- **Trust but verify.** Proposals are the staged-write affordance: the agent
  proposes, the human decides.
- **Bridgeable.** A bridge reads and writes the same JSON the host renders
  (`messages`, proposal decisions). The thread itself adds nothing an agent
  has to scrape.

## Accessibility

- The log is `role="log"`, `aria-live="polite"`, `aria-relevant="additions"`,
  focusable (`tabIndex=0`) so it can be scrolled from the keyboard.
- It is labelled by `heading` (rendered as `h2`, or `headingLevel`), or by
  `labels.log` ("Conversation") when there is no heading.
- Every string is in `labels` for translation, including role names and the
  "N new messages" text.

## Layouts

### Side panel (Charlotte)

```tsx
<ResizablePanels defaultValue={68} label="Resize the chat panel">
  <Editor value={session.state.doc} onOp={session.applyHuman} />
  <ChatThread
    className="h-full"
    heading="Charlotte"
    headingLevel={2}
    messages={session.messages}           // reduced from the event log
    streaming="progressive"
    ownRoles={["user"]}
    groupConsecutive
    onProposalAccept={(m) => session.accept(m.proposal!.id)}
    onProposalReject={(m) => session.reject(m.proposal!.id)}
    onActivity={(e) => activity.emit(toAutoActivity(e))}
    renderActions={(m) => m.role === "assistant" && m.status === "sent" ? <CopyButton text={m.content} /> : null}
    composer={
      <PromptInput
        placeholder="Ask Charlotte to change the page..."
        sendDisabled={session.running}
        onSubmit={(text) => session.send(text)}
      />
    }
  />
</ResizablePanels>
```

### Ticket thread (support)

```tsx
<ChatThread
  className="h-full"
  heading={`${ticket.reference}: ${ticket.subject}`}
  messages={ticket.messages}              // the server already filtered internal notes for customers
  ownRoles={["staff"]}
  separators="day"
  hasEarlier={ticket.hasEarlier}
  onLoadEarlier={() => loadEarlier(ticket.reference)}
  onProposalAccept={(m) => cards.approve(m.proposal!.id, m.meta?.version as number)}
  onProposalReject={(m) => cards.openReject(m.proposal!.id)}
  onActionError={(err) => toast.error(String(err))}
  composer={
    <Composer
      actions={<MultiSwitch value={mode} onValueChange={setMode} list={[{ value: "public", label: "Reply" }, { value: "internal", label: "Internal note" }]} />}
      onSubmit={(text) => postMessage(ticket.reference, { text, visibility: mode })}
    />
  }
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| messages | `ChatMessageData[]` | - | The messages, oldest first. Required |
| heading | `ReactNode` | - | Visible title; the log is labelled by it |
| headingLevel | `2 \| 3 \| 4 \| 5 \| 6` | `2` | Heading element |
| composer | `ReactNode` | - | Rendered below the log (`Composer` / `PromptInput`) |
| renderActions | `(m) => ReactNode` | - | Per-message actions slot |
| onLoadEarlier | `() => void \| Promise` | - | Shows the load-earlier control |
| hasEarlier | `boolean` | `true` with `onLoadEarlier` | Hide the control when there is nothing earlier |
| loadingEarlier | `boolean` | `false` | Host-driven busy state for the control |
| onProposalAccept / onProposalReject | `(m) => void \| Promise` | - | Proposal decisions |
| onActionError | `(error, action) => void` | - | A returned Promise rejected |
| onActivity | `(e: ChatThreadActivity) => void` | - | Every interaction |
| stickToBottom | `boolean` | `true` | Follow new messages while at the bottom |
| bottomThreshold | `number` | `48` | Pixels from the bottom that count as "at the bottom" |
| onAtBottomChange | `(atBottom) => void` | - | The reader arrived at / left the bottom |
| separators | `"none" \| "day"` | `"none"` | Day separators |
| formatDay / formatTime | `(d: Date) => string` | locale | Date and time labels |
| groupConsecutive | `boolean \| number` | `false` | Merge consecutive messages (5 min, or ms) |
| ownRoles | `string[]` | `["user"]` | Roles aligned as the viewer's own |
| streaming | `true \| "progressive"` | `true` | How a streaming message renders its tail |
| contentOptions | `ChatContentOptions` | - | Passed to every `ContentRenderer` (no `unsafe`) |
| renderAttachment | `(a, m) => ReactNode` | - | Replace one attachment's rendering |
| empty | `ReactNode` | - | Shown when there are no messages |
| labels | `Partial<ChatThreadLabels>` | English | Every visible string |
| classNames | `ChatThreadClassNames` | - | `root`, `heading`, `log`, `composer`, `separator`, `jump`, `message`, `bubble`, `header`, `actions`, `proposal` |
| ref | `Ref<ChatThreadHandle>` | - | `scrollToLatest`, `scrollToMessage`, `element` |

Other HTML attributes (including `data-*`) go on the root; `onScroll` is
forwarded from the log, which is the element that scrolls.

`ChatMessage` takes `message`, `actions`, `grouped` and the same display props
(`ownRoles`, `streaming`, `contentOptions`, `labels`, `formatTime`,
`renderAttachment`, the proposal callbacks, `onActivity`, `onActionError`,
`classNames`).

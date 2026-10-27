# PromptInput

The chat composer every AI app rebuilds. Auto-growing multi-line input with slash commands, @ mentions, drop-to-attach, keyboard submit, and a live token-budget meter.

Promoted from the dreaming sandbox on 2026-05-12.

## Import

```tsx
import { PromptInput } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<PromptInput
  budgetTokens={32000}
  commands={[
    { name: "/explain", hint: "explain the selected text" },
    { name: "/rewrite", hint: "rewrite in a different tone" },
  ]}
  mentions={[
    { id: "planner", name: "Planner", kind: "agent" },
    { id: "ada", name: "Ada", kind: "person" },
    { id: "readme", name: "README.md", kind: "file" },
  ]}
  onSubmit={(text, attachments) => send(text, attachments)}
/>
```

## Features

- Auto-resizes up to `maxHeight`.
- `/` opens a filtered command palette. ↑/↓ navigate, Enter inserts.
- `@` opens a mention picker filtered against `mentions`.
- Drop files anywhere on the input to attach. Chip bar shows attachments.
- ⌘+Enter (or Ctrl+Enter) submits. Plain Enter inserts a newline.
- Token-budget meter colours green → amber → red as headroom drops.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| budgetTokens | `number` | — | Token budget for the meter. |
| commands | `PromptCmd[]` | `[]` | Slash commands. Names must start with `/`. |
| mentions | `PromptMention[]` | `[]` | `{ id, name, kind }`. `kind` is free-form (`"agent"`, `"file"`, `"person"`, …). |
| onSubmit | `(text, attachments) => void` | — | Called on ⌘/Ctrl+Enter or send button. |
| showHint | `boolean` | `true` | Show the "⌘ + Enter to send" hint. |
| placeholder | `string` | `"Ask anything…"` | Placeholder text. |
| charsPerToken | `number` | `4` | Rough estimator for the token meter. |
| mentionColor | `Record<string, string>` | sensible defaults | Override the chip colour per mention kind. |
| maxHeight | `number` | `280` | Max textarea height in pixels. |
| aboveInput | `ReactNode` | — | Rendered inside the rounded shell, above the textarea. Use this for a drawer of tools/files/prompts/etc. so the drawer and composer share one visual panel — see [ChatDrawer](./ChatDrawer.md). Added in `3.2.0`. |

### Controlled state and drafts

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | — | The text, controlled. With paste pills on, it carries a `pasteMarker(id)` per pill. |
| defaultValue | `string` | `""` | The starting text, uncontrolled. |
| onChange | `(text) => void` | — | Called when the person edits the text, and with `""` after a send. Not called by `setDraft`. |
| draft | `PromptDraft` | — | The whole draft (text, pills, attachments), controlled. Takes precedence over `value`. |
| defaultDraft | `PromptDraft` | — | The starting draft, uncontrolled. Takes precedence over `defaultValue`. |
| onDraftChange | `(draft) => void` | — | Called on every change the person makes, and when a `persistAttachment` handle arrives. Not called by `setDraft`. |
| persistAttachment | `(file, entry) => string \| undefined \| Promise<…>` | — | Stores an attached or pasted file and returns a handle. The handle becomes `entry.ref`. |
| restoreAttachment | `(entry) => File \| undefined \| Promise<…>` | — | Gets the File back for a restored entry. |

## Saving and restoring a draft

The draft is plain JSON, so a host can store it anywhere:

```tsx
const composer = useRef<PromptInputHandle>(null);

// save, e.g. on onDraftChange or before quitting
localStorage.setItem(`draft:${chatId}`, JSON.stringify(composer.current!.getDraft()));

// restore after a restart. This does not focus the composer or move any caret.
const saved = localStorage.getItem(`draft:${chatId}`);
if (saved) composer.current!.setDraft(JSON.parse(saved));

<PromptInput ref={composer} budgetTokens={32000} pasteThreshold={500} pasteImages onSubmit={send} />
```

- `setDraft(draft, { focus?: false })` does **not** focus unless you pass `{ focus: true }`. It never moves the caret of whatever does have focus.
- Focus from `focus()` or `setDraft(draft, { focus: true })` never scrolls the page or any ancestor (it passes `{ preventScroll: true }`). To let the browser scroll the composer into view, pass `{ preventScroll: false }` to either.
- `setDraft` does not call `onChange` / `onDraftChange`. You set the draft yourself, so you already have it.
- A draft with an unknown `v` is refused with a console warning.

### Labelled text pills

A text pill normally reads `Pasted text · N characters`. Give it a `label` and
the pill shows that instead. Use this when the host puts the pill there itself,
for example a plan step sent into the chat:

```tsx
composer.current!.setDraft({
  v: 1,
  text: `Do this next: ${pasteMarker("step-3")}`,
  pills: [{ kind: "text", id: "step-3", text: fullStep, label: "Step 3: migrate the billing tables" }],
  attachments: [],
});
```

- The label is for display only. Sending still expands the pill to the full `text`.
- Its accessible name is `Insert this pasted text: <label>, N characters`.
- It is plain text and is never parsed as HTML. Line breaks, control characters
  and U+FFFC become single spaces, and anything past 80 characters is cut with
  `…`. If the label is blank or not a string, the generic text is shown.
- `label` round-trips through `getDraft`, `setDraft`, `defaultDraft`, `draft`
  and `onDraftChange`.

### Attachments: where the bytes go

A `File` cannot be stored as JSON, and by default a draft does not carry the
bytes. Base64 in every draft would make each save as large as everything
attached, which matters for a host that saves on every keystroke. Each file in
a draft is `{ id, name, type, bytes, ref? }`. You decide where the bytes live:

```tsx
// Your own store (IndexedDB, upload, disk): return a handle, async is fine.
<PromptInput
  persistAttachment={async (file, entry) => { await idb.put(entry.id, file); return entry.id; }}
  restoreAttachment={(entry) => (entry.ref ? idb.get(entry.ref) : undefined)}
  …
/>

// Or keep the bytes in the draft itself, simple for small files:
<PromptInput
  persistAttachment={promptFileToDataUrl}
  restoreAttachment={(f) => (f.ref ? promptDataUrlToFile(f.ref, f.name, f.type) : undefined)}
  …
/>
```

When there is no File for a restored entry, its chip or pill still shows. It
reaches `onSubmit` with its `ref` and `file: undefined`, and the host sends it
from its own store.

## Types

```ts
type PromptCmd = { name: string; hint: string };
type PromptMention = { id: string; name: string; kind: string };
type PromptAttachment = { id: string; name: string; bytes: number; file?: File; type?: string; ref?: string };

interface PromptDraftFile { id: string; name: string; type: string; bytes: number; ref?: string }
type PromptDraftPill =
  | { kind: "text"; id: string; text: string; label?: string }
  | { kind: "image"; id: string; label: string; file: PromptDraftFile };
interface PromptDraft { v: 1; text: string; pills: PromptDraftPill[]; attachments: PromptDraftFile[] }

interface PromptInputHandle {
  getDraft(): PromptDraft;
  setDraft(draft: PromptDraft, options?: { focus?: boolean; preventScroll?: boolean }): void;
  focus(options?: { preventScroll?: boolean }): void; // preventScroll defaults to true
}
```

Data handles: the root `[data-react-fancy-prompt-input]`, each attachment chip
`[data-react-fancy-prompt-input-attachment="<id>"]`, plus `-attach`, `-send`,
`-meter` and `-hint`.

## Defaults

| Mention kind | Default colour |
|--------------|----------------|
| `"agent"` | violet |
| `"file"` | emerald |
| `"person"` | blue |
| other | zinc |

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

## Types

```ts
type PromptCmd = { name: string; hint: string };
type PromptMention = { id: string; name: string; kind: string };
type PromptAttachment = { id: string; name: string; bytes: number };
```

## Defaults

| Mention kind | Default colour |
|--------------|----------------|
| `"agent"` | violet |
| `"file"` | emerald |
| `"person"` | blue |
| other | zinc |

# ChatDrawer

A tabbed, collapsible drawer that mounts in `PromptInput`'s `aboveInput` slot so the drawer and composer share one rounded shell. Each tab gets a numbered chip and a content panel; only one panel renders at a time. Slot-driven — you decide what each tab shows.

Added in `3.2.0`.

## Import

```tsx
import { ChatDrawer, PromptInput } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
const [tab, setTab] = useState("tools");
const [open, setOpen] = useState(true);

<PromptInput
  budgetTokens={200_000}
  placeholder={tab === "deal" ? "Ask about this deal…" : "Type a message…"}
  onSubmit={send}
  aboveInput={
    <ChatDrawer
      tabs={[
        { id: "files",   label: "Files" },
        { id: "tools",   label: "Chat Tools" },
        { id: "prompts", label: "Chat Prompts" },
        { id: "deal",    label: "IBM Analytics Platform", number: null },
      ]}
      activeTabId={tab}
      onTabChange={setTab}
      open={open}
      onToggle={setOpen}
    >
      {tab === "files"   && <FilesPanel />}
      {tab === "tools"   && <ToolsGrid />}
      {tab === "prompts" && <PromptsList />}
      {tab === "deal"    && <DealContext />}
    </ChatDrawer>
  }
/>
```

## Props

| Prop            | Type                       | Default      | Description                                            |
| --------------- | -------------------------- | ------------ | ------------------------------------------------------ |
| `tabs`          | `ChatDrawerTab[]`          | —            | Ordered list of tabs.                                  |
| `activeTabId`   | `string`                   | —            | Currently selected tab.                                |
| `onTabChange`   | `(id: string) => void`     | —            | Fires when a chip is clicked.                          |
| `open`          | `boolean`                  | `true`       | Body visibility.                                       |
| `onToggle`      | `(open: boolean) => void`  | —            | Fires when the chevron is clicked.                     |
| `children`      | `ReactNode`                | —            | Body content for the active tab.                       |
| `minBodyHeight` | `number`                   | `140`        | Min height of the body (px) when open.                 |
| `className`     | `string`                   | —            | Extra class on the outer container.                    |

### Tab

```ts
type ChatDrawerTab = {
  id: string;
  label: string;
  /** Override the numbered chip. `null` hides the number entirely
   *  (handy for context-specific tabs like "IBM Analytics Platform"). */
  number?: number | null;
};
```

By default tabs are numbered by position (1, 2, 3, …). Pass `number: null` to suppress.

## See Also

- [PromptInput](./PromptInput.md) — pairs via the `aboveInput` slot so they share one rounded panel
- [InputTag](./InputTag.md) — drop into the same composer to add `/` and `@` autocomplete

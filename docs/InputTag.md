# InputTag

A trigger-driven autocomplete picker that attaches to *any* text surface via an adapter. Type a configured trigger character (`/`, `@`, `#`, `:`, anything) at a word boundary to open a filtered menu; ↑↓ to move, Enter or Tab to insert, Esc to dismiss.

Added in `3.2.0`.

## Import

```tsx
import {
  InputTag,
  textareaAdapter,
  inputAdapter,
  contentEditableAdapter,
  controlledAdapter,
} from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
import { useRef, useState } from "react";
import { InputTag, textareaAdapter } from "@particle-academy/react-fancy";

const COMMANDS = [
  { name: "/explain", hint: "explain the selection" },
  { name: "/rewrite", hint: "rewrite in a different tone" },
];

const MENTIONS = [
  { id: "ada", name: "Ada", kind: "person" },
  { id: "readme", name: "README.md", kind: "file" },
];

function ChatInput() {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const adapter = useMemo(() => textareaAdapter(ref), []);

  return (
    <>
      <textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} />
      <InputTag
        adapter={adapter}
        triggers={{
          "/": { items: COMMANDS, insert: (c) => `${c.name} ` },
          "@": { items: MENTIONS, insert: (m) => `@${m.name} ` },
        }}
      />
    </>
  );
}
```

The component renders nothing until a trigger is active. When the trigger fires, a floating menu anchored to the input shows filtered items. Picking inserts the configured replacement and closes the menu.

## Triggers

Each trigger character maps to a config:

```tsx
{
  "/": {
    items: COMMANDS,
    insert: (item, query) => `${item.name} `,   // replaces "/<query>" with this
    filter?: (item, query) => boolean,           // default: case-insensitive substring match against name/id
    render?: (item, active) => ReactNode,        // default: item.name | item.id
    keyOf?: (item) => string,                    // default: same as render fallback
    label?: "Commands",                          // optional header
  }
}
```

`insert` receives the matched item and the current query (text typed after the trigger character).

`filter` defaults to a case-insensitive substring check against `keyOf(item)`. Pass `() => true` to bypass filtering — handy when `items` is being driven by an async source.

`render` lets you customize each row. The second arg is `active` (current keyboard cursor).

## Adapters

`<InputTag>` is surface-agnostic. The component calls into an adapter for read, write, anchor positioning, and key interception. Four built-in adapters cover the DOM cases:

| Adapter                              | Surface                              |
| ------------------------------------ | ------------------------------------ |
| `textareaAdapter(ref)`               | `<textarea>`                         |
| `inputAdapter(ref)`                  | `<input>`                            |
| `contentEditableAdapter(ref)`        | any `contenteditable` element        |
| `controlledAdapter({ anchorRef, onReplaceRange })` | hosts that fully own text state |

Non-DOM surfaces (code editors, sheet cell editors, whiteboard sticky notes) ship adapters from their own packages — e.g. `<CodeEditorInputTag>` from `@particle-academy/fancy-code`. For ad-hoc cases, write your own (~30 lines) against the contract:

```ts
type InputTagAdapter = {
  subscribe: (fn: (state: { text: string; caretIndex: number }) => void) => () => void;
  replaceRange: (start: number, end: number, replacement: string) => void;
  getAnchorRect: () => DOMRect | null;
  onKey: (handler: (e: KeyboardEvent) => boolean) => () => void;
};
```

The DOM adapters use React's native value setter so the consumer's controlled `onChange` fires correctly when the picker writes back — no state-sync gotchas.

## Props

| Prop          | Type                          | Default          | Description                                 |
| ------------- | ----------------------------- | ---------------- | ------------------------------------------- |
| `adapter`     | `InputTagAdapter`             | —                | Surface adapter.                            |
| `triggers`    | `Record<string, …>`           | —                | Per-trigger-char config (see above).        |
| `maxItems`    | `number`                      | `8`              | Max rows shown.                             |
| `placement`   | `"bottom-left"` \| `"bottom-right"` \| `"top-left"` \| `"top-right"` | `"bottom-left"` | Anchor position relative to surface. |
| `className`   | `string`                      | —                | Class on the popover container.             |
| `style`       | `CSSProperties`               | —                | Inline style on the popover container.      |
| `onPick`      | `(info) => void`              | —                | Fires after each insertion.                 |

## Trigger Detection

A trigger is active when one of the configured characters appears between the caret and the nearest preceding whitespace (or start of text), with no other non-trigger / non-whitespace breaks. The "query" is everything between the trigger character and the caret.

Examples:

- `hello /expl|`           → query is `expl`, opens `/` picker
- `email me at user@gma|`  → query is `gma`, opens `@` picker
- `path/to/fi|`            → no trigger (caret is in a word that's not preceded by whitespace)
- `#urgent #wo|nt`         → opens `#` picker with query `wo`

## Custom Surfaces

For non-DOM surfaces, write an adapter. Minimal `controlledAdapter` example for a host that owns text state:

```tsx
const anchorRef = useRef<HTMLDivElement>(null);

const adapter = useMemo(
  () =>
    controlledAdapter({
      anchorRef,
      onReplaceRange: (start, end, replacement) => {
        setText((cur) => cur.slice(0, start) + replacement + cur.slice(end));
        setCaret(start + replacement.length);
      },
    }),
  [],
);

// host pushes updates whenever text/caret changes
useEffect(() => {
  adapter.notify({ text, caretIndex: caret });
}, [text, caret]);
```

## See Also

- [PromptInput](./PromptInput.md) — uses similar trigger logic internally; use `InputTag` when you want the picker without the rest of the composer
- [ChatDrawer](./ChatDrawer.md) — composes with `PromptInput`'s `aboveInput` slot for tabbed-tools drawer UX

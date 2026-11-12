# ContentReaction

Emoji reactions on any piece of content: a comment, a post, a message. A compact trigger shows the active reactions, or a "React" placeholder when there are none. Clicking it opens a picker in which each reaction toggles on and off.

## Import

```tsx
import { ContentReaction } from "@particle-academy/react-fancy";
// or the subpath
import { ContentReaction, DEFAULT_CONTENT_REACTIONS, toggleReaction } from "@particle-academy/react-fancy/content-reaction";
```

## Basic Usage

```tsx
const [reactions, setReactions] = useState<string[]>([]);

<ContentReaction value={reactions} onChange={(next) => setReactions(next)} />
```

`onChange` also receives what changed, for a host that writes one reaction at a time:

```tsx
<ContentReaction
  value={mine}
  onChange={(next, { key, on }) => {
    setMine(next);
    on ? api.react(commentId, key) : api.unreact(commentId, key);
  }}
/>
```

## Reactions

The default set, exported as `DEFAULT_CONTENT_REACTIONS`, in this order:

| Key | Label |
|------|------|
| `strongly-agree` | Strongly agree (hundred points) |
| `like` | Like (thumbs up) |
| `love` | Love (red heart) |
| `insightful` | Insightful (light bulb) |
| `funny` | Funny (face with tears of joy) |
| `sad` | Sad (crying face) |
| `angry` | Angry (enraged face) |
| `dislike` | Dislike (thumbs down) |

Pass your own set as `{ key, emoji, label }[]`. `label` is the item's accessible name and tooltip.

```tsx
<ContentReaction
  value={value}
  onChange={setValue}
  reactions={[
    { key: "ship", emoji: shipEmoji, label: "Ship it" },
    { key: "hold", emoji: holdEmoji, label: "Hold" },
  ]}
/>
```

An emoji needs a colour emoji font to render. Desktop and mobile systems have one; a minimal Linux container may not.

## Modes

- `mode="multi"` (default): any number of reactions can be active. The picker stays open after a select, so several can be chosen in one go.
- `mode="single"`: at most one. Choosing one replaces the others, and choosing the active one clears it. The picker closes after a select.

`closeOnSelect` overrides either default. The rule itself is exported as `toggleReaction(value, key, mode)`, which returns `{ next, on }`, so a server, or an agent bridge, can apply the same one.

## Aggregate counts

For multi-user apps, pass `counts` (by key) and, if it differs from `value`, `mine`:

```tsx
<ContentReaction value={mine} onChange={toggle} counts={{ like: 12, love: 3 }} />
```

The trigger then shows every reaction with a count above 0, with its count, and highlights the ones in `mine` (which defaults to `value`). Each picker item's accessible name includes its count ("Like (12)"). The component never changes `counts` itself: update them when the host has recorded the reaction.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string[]` | - | Active reaction keys (controlled) |
| `onChange` | `(next: string[], meta: { key: string; on: boolean }) => void` | - | Called on every toggle |
| `reactions` | `{ key; emoji; label }[]` | `DEFAULT_CONTENT_REACTIONS` | The reactions offered |
| `mode` | `"multi" \| "single"` | `"multi"` | See Modes |
| `counts` | `Record<string, number>` | - | Aggregate counts by key |
| `mine` | `string[]` | `value` | The current user's keys, highlighted among the counts |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Trigger and picker size |
| `disabled` | `boolean` | `false` | The trigger does not open |
| `placement` | `Placement` | `"top-start"` | Where the picker opens. It flips to the opposite side when there is no room (top and bottom, left and right) and is kept inside the viewport |
| `closeOnSelect` | `boolean` | `false` multi, `true` single | Close the picker after a select |
| `triggerLabel` | `string` | `labels.trigger` | Placeholder text and accessible name when nothing is active |
| `renderTrigger` | `(state) => ReactNode` | - | Replaces the trigger's content. The trigger button and its ARIA stay. `state` is `{ value, active, counts, mine, open, disabled, label }` |
| `labels` | `ContentReactionLabels` | see below | Every word, for translation |
| `id` | `string` | generated | Root id. The trigger is `{id}-trigger`, the picker `{id}-menu` |

Other props reach the root `<div>`.

### labels

| Key | Default |
|------|------|
| `trigger` | `"React"` |
| `menu` | `"Reactions"` (the picker's accessible name) |
| `triggerActive` | `"{trigger}: {reactions}"` (the trigger's accessible name while reactions show without counts, for example "React: Like, Love"; with counts it is the trigger's description, for example "React: Like 3, Love 1") |
| `triggerCounts` | `"{counts}, {trigger}"` (the trigger's accessible name while counts show, for example "3 1, React". Keep `{counts}` first: WCAG 2.5.3 needs the visible text in the name) |
| `itemCount` | `"{label} ({count})"` (an item's accessible name when `counts` is given) |

## Behavior

- **The picker renders in a portal**, so an `overflow: hidden` ancestor cannot clip it.
- **No hover behaviour at all.** It opens on click or from the keyboard, never on hover, and it never closes on mouse-leave, so there is no dead zone between the trigger and the picker. It closes only on an outside click, Escape, or a select when `closeOnSelect` is on.
- **Escape returns focus to the trigger.** An outside click leaves focus where the click put it.
- **Keyboard:** Enter, Space or ArrowDown on the trigger opens the picker on the first item; ArrowUp opens it on the last. Inside, the arrow keys move between items with roving focus and wrap (ArrowLeft and ArrowRight follow the screen, so in RTL ArrowLeft is next). Home and End jump to the ends. Enter and Space toggle the focused item. Tab hands focus back to the trigger and continues from there; the picker stays open.
- **ARIA:** the trigger is a `<button>` with `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. The picker is `role="menu"`, and each item is `role="menuitemcheckbox"` with `aria-checked`. The emoji glyphs are `aria-hidden`; the labels carry the names. With counts showing, the trigger's name starts with the visible counts in order ("18 7 4, React"), so it contains the visible text (WCAG 2.5.3, Label in Name), and the per-reaction details ("React: Like 18, Insightful 7, Love 4") are its `aria-describedby` description.
- **Theming:** the active highlight is the `surface-muted` fill with an `accent` ring (`--fancy-surface-muted` / `--fancy-accent`, and their `-dark` pair). Surfaces, borders, text and the focus ring read their usual tokens too. No literal colours.
- SSR-safe: the picker only mounts on the client after it is opened.

## Stable handles

| Handle | On |
|------|------|
| `data-react-fancy-content-reaction` | Root, with `data-value` (active keys, comma-separated), `data-mode`, `data-size`, `data-open` and `data-disabled` |
| `data-react-fancy-content-reaction-trigger` | The trigger button |
| `data-react-fancy-content-reaction-chip` | A reaction shown on the trigger, with `data-reaction-key` and `data-mine` |
| `data-react-fancy-content-reaction-description` | The hidden description of the trigger while counts show (its `aria-describedby` target) |
| `data-react-fancy-content-reaction-menu` | The picker (portalled), with `data-placement` (the side it actually opened on) |
| `data-react-fancy-content-reaction-item` | A picker item, with `data-reaction-key` and `data-state="on" \| "off"` |

## Agents

An agent reads and writes the host's `value` / `onChange`; it never needs to open the picker. `registerContentReactionBridge` in `@particle-academy/agent-integrations` exposes `reaction_list`, `reaction_read`, `reaction_toggle` and `reaction_set` over an adapter the host wires to the same state.

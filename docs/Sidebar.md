# Sidebar

A collapsible sidebar navigation with icon-only or letter-abbreviated collapsed mode, submenus, groups, and a toggle button.

## Import

```tsx
import { Sidebar } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
import { Sidebar, Icon } from "@particle-academy/react-fancy";

<Sidebar>
  <Sidebar.Item href="/" icon={<Icon name="home" size="sm" />} active>Home</Sidebar.Item>
  <Sidebar.Item href="/settings" icon={<Icon name="settings" size="sm" />}>Settings</Sidebar.Item>
  <Sidebar.Group label="Projects">
    <Sidebar.Item href="/project-a">Project A</Sidebar.Item>
    <Sidebar.Item href="/project-b">Project B</Sidebar.Item>
  </Sidebar.Group>
  <Sidebar.Toggle />
</Sidebar>
```

## Props

### Sidebar (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| collapsed | `boolean` | - | Controlled collapsed state |
| defaultCollapsed | `boolean` | `false` | Default collapsed state (uncontrolled) |
| onCollapsedChange | `(collapsed: boolean) => void` | - | Callback when collapsed state changes |
| collapseMode | `"icons" \| "letters"` | `"icons"` | How items display when collapsed: icons only, or first 3 letters |
| embedded | `boolean` | `false` | Drop the app-shell chrome (right border, background, fixed `w-60`) for a sidebar inside a card, panel or drawer |
| navLabel | `string` | - | Wrap the children in `<nav aria-label={navLabel}>` so the items form a navigation landmark. Omitted, no `<nav>` is rendered |
| keyboardNav | `boolean` | `false` | ArrowUp / ArrowDown / Home / End between items, with a roving tabindex (the rail becomes one tab stop). See [Keyboard navigation](#keyboard-navigation) |
| className | `string` | - | Additional CSS classes |

### Sidebar.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Item label |
| href | `string` | - | Link URL |
| icon | `ReactNode` | - | Leading icon |
| active | `boolean` | - | Active state highlight |
| disabled | `boolean` | - | Disable the item |
| badge | `ReactNode` | - | Trailing badge element (expanded only, unless `collapsedBadge`) |
| badgeLabel | `string` | - | What the badge means for screen readers ("2 agents"). The visible badge is hidden from assistive tech and the name reads "tynn, 2 agents". See [Badges and the accessible name](#badges-and-the-accessible-name) |
| collapsedBadge | `boolean` | `false` | Also show `badge` on a collapsed rail, as an overlay at the icon's corner. Best for short counts |
| dot | `boolean \| Color` | - | Attention dot at the icon's corner, shown expanded and collapsed. `true` is red; any Badge colour otherwise |
| dotLabel | `string` | - | Screen-reader text for the dot ("3 unread"), visually hidden and added to the item's accessible name |
| dotTooltip | `boolean` | `false` | Also show `dotLabel` to sighted users, in a `Tooltip` beside the item on hover and keyboard focus. Needs `dot` and `dotLabel`. See [Showing the dot's words](#showing-the-dots-words) |
| onClick | `() => void` | - | Click handler |
| className | `string` | - | Additional CSS classes |

### Sidebar.Group

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Grouped items |
| label | `string` | - | Group heading |
| className | `string` | - | Additional CSS classes |

### Sidebar.Submenu

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Submenu items |
| label | `string` | - | Submenu trigger label (required) |
| icon | `ReactNode` | - | Leading icon |
| defaultOpen | `boolean` | - | Whether the submenu starts open |
| className | `string` | - | Additional CSS classes |

### Sidebar.Toggle

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | `string` | - | Additional CSS classes |

## Collapsible Sidebar

```tsx
const [collapsed, setCollapsed] = useState(false);

<Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} collapseMode="icons">
  <Sidebar.Item icon={<Icon name="home" size="sm" />}>Dashboard</Sidebar.Item>
  <Sidebar.Item icon={<Icon name="users" size="sm" />}>Users</Sidebar.Item>
  <Sidebar.Submenu label="Reports" icon={<Icon name="bar-chart-3" size="sm" />} defaultOpen>
    <Sidebar.Item>Monthly</Sidebar.Item>
    <Sidebar.Item>Yearly</Sidebar.Item>
  </Sidebar.Submenu>
  <Sidebar.Toggle />
</Sidebar>
```

### collapseMode

- `"icons"` (default) — only the icon is shown when collapsed; falls back to the first 3 letters if no icon is provided
- `"letters"` — the first 3 letters of the label are always shown

## Attention marks on a compact rail

A collapsed rail shows only icons, so `badge` is hidden there by default. Use
`dot` for an unread, warning or "needs you" mark: it renders at the icon's
corner in both modes. A dot is only colour, so give it a `dotLabel` for screen
readers.

```tsx
<Sidebar collapsed navLabel="Main">
  <Sidebar.Item icon={<Icon name="inbox" size="sm" />} dot dotLabel="3 unread">
    Inbox
  </Sidebar.Item>
  <Sidebar.Item icon={<Icon name="triangle-alert" size="sm" />} dot="amber" dotLabel="needs you">
    Deploys
  </Sidebar.Item>
  <Sidebar.Item
    icon={<Icon name="message-square" size="sm" />}
    badge={<Badge size="sm" color="blue" variant="solid">12</Badge>}
    collapsedBadge
  >
    Messages
  </Sidebar.Item>
</Sidebar>
```

- The collapsed item is still named by its label (`title` and a visually
  hidden copy of the label), so the dot label or a badge count never replaces
  the name: a screen reader hears "Inbox 3 unread".
- With both `dot` and `collapsedBadge` on a collapsed item, the badge takes the
  top corner and the dot moves to the bottom one (`data-position="bottom"`).
- Handles: `data-react-fancy-sidebar-dot` (with `data-color` and
  `data-position`), `data-react-fancy-sidebar-dot-label`,
  `data-react-fancy-sidebar-badge` for the collapsed badge overlay.

### Showing the dot's words

`dotLabel` reaches screen readers only. When the words matter to everyone
("Phone paired, expires 3 Nov"), add `dotTooltip`: the item shows them in a
Fancy `Tooltip` to its right on hover and on keyboard focus.

```tsx
<Sidebar.Item
  icon={<Icon name="settings" size="sm" />}
  dot="amber"
  dotLabel="Phone paired, expires 3 Nov"
  dotTooltip
>
  Settings
</Sidebar.Item>
```

- It reuses `dotLabel` rather than taking its own text, so what a sighted user
  sees and what a screen reader hears cannot drift apart.
- On a collapsed item the tooltip replaces the native `title`, so there is one
  bubble rather than two, and it shows the label ("Settings") above the dot's
  words. Expanded, the label is already visible and only the words show.
- Screen readers hear the words once, in the item's name. The bubble is
  `aria-hidden` and is not linked with `aria-describedby`.
- Without `dot` and `dotLabel` it does nothing. Handle:
  `data-react-fancy-sidebar-tooltip` (the bubble's content).

## Badges and the accessible name

A badge's text is part of the item's accessible name. A visually hidden space
separates it from the label, so a bare count reads "tynn 2". When the count
needs words to make sense, pass `badgeLabel`: the visible badge is hidden from
assistive tech and the label is read instead, after a comma.

```tsx
<Sidebar.Item
  icon={<Icon name="bot" size="sm" />}
  badge={<Badge size="sm">2</Badge>}
  badgeLabel="2 agents"
>
  tynn
</Sidebar.Item>
// accessible name: "tynn, 2 agents"
```

- It composes with `dotLabel` ("tynn needs you, 2 agents") and with
  `collapsedBadge` on a collapsed rail, where the item is still named by its
  label first.
- Collapsed without `collapsedBadge` the badge is not rendered, so
  `badgeLabel` is not read either.
- Handle: `data-react-fancy-sidebar-badge-label`.

## Navigation landmark

`Sidebar` renders an `<aside>`. Pass `navLabel` to wrap its children in a
labelled `<nav>`, so the items appear in a screen reader's landmark list:

```tsx
<Sidebar navLabel="Main">…</Sidebar>
```

The `<nav>` (`data-react-fancy-sidebar-nav`) takes over the column layout and
fills the rail, so a footer pushed down with `mt-auto` still reaches the
bottom. Without `navLabel` the markup is unchanged.

## Keyboard navigation

`keyboardNav` turns the rail into one tab stop with a roving tabindex:

- **Tab** lands on the active item (the one with `active`), or the first
  enabled item when none is active. `Sidebar.Toggle` keeps its own tab stop.
- **ArrowDown / ArrowUp** move to the next / previous item; **Home / End** to
  the first / last. No wrap at the ends.
- Disabled items are skipped. An open `Sidebar.Submenu`'s trigger and its items
  are in the sequence; a closed submenu's items are skipped (its trigger gets
  `aria-expanded`). Enter / Space on a trigger opens it as usual.
- Keys pressed in an input, textarea, select or contenteditable inside the
  sidebar are never intercepted, nor are arrows with a modifier key.

It is opt-in because it changes Tab order: without it, every item is its own
tab stop, exactly as before.

```tsx
<Sidebar keyboardNav navLabel="Main">…</Sidebar>
```

## useSidebar Hook

Access collapsed state from any child component:

```tsx
import { useSidebar } from "@particle-academy/react-fancy";

function CollapseAware() {
  const { collapsed, setCollapsed } = useSidebar();
  return <button onClick={() => setCollapsed(!collapsed)}>Toggle</button>;
}
```

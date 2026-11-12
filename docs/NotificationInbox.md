# NotificationInbox

A controlled list of notifications. Data in (`items`), events out
(`onMarkRead`, `onMarkAllRead`, `onAction`): it never changes an item's read
state itself. The host does, and passes the new `items`.

## Import

```tsx
import { NotificationInbox, type NotificationItem } from "@particle-academy/react-fancy";
// or the subpath
import { NotificationInbox } from "@particle-academy/react-fancy/notification-inbox";
```

## Basic Usage

```tsx
const items: NotificationItem[] = [
  { id: "n1", title: "Build passed", body: "main is green", time: "2026-11-12T11:55:00Z", read: false, href: "/builds/1", actionLabel: "Open build" },
  { id: "n2", title: "Invoice paid", time: 1762905600000, read: true, href: "/billing" },
];

<NotificationInbox
  items={items}
  onMarkRead={(id) => markRead(id)}
  onMarkAllRead={() => markAllRead()}
  linkComponent={Link} // e.g. Inertia's Link
/>
```

## Item shape

```ts
interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  time: number | string | Date; // epoch ms, ISO 8601, or a Date
  read: boolean;
  href?: string;          // no href, no action link
  actionLabel?: string;   // default labels.action ("View")
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | `NotificationItem[]` | **required** | Shown in the order given |
| onMarkRead | `(id: string) => void` | - | An unread item's "Mark as read" button. Without it, no per-item button |
| onMarkAllRead | `() => void` | - | The header's "Mark all as read", shown while anything is unread. Without it, no such button |
| onAction | `(id: string) => void` | - | Called when an item's action link is followed, before navigation |
| linkComponent | `ElementType` | `"a"` | Renders the action links: a router's `Link` for client-side navigation. It receives `href`, `className`, `dir`, `onClick`, the `data-*` handle and `children` |
| locale | `string` | runtime | BCP 47 locale for the relative times |
| now | `number \| string \| Date` | time of render | The moment relative times are measured from. Advance it on an interval to keep them current, or fix it for a deterministic render |
| headingLevel | `2 \| 3 \| 4 \| 5 \| 6` | `2` | The heading element |
| labels | `NotificationInboxLabels` | English | See below |
| ...rest | `HTMLAttributes` | - | Reach the root `<section>`, with the `ref` |

### Labels

| Key | Default |
|-----|---------|
| `heading` | `"Notifications"` |
| `unreadCount` | `"{count} unread"` |
| `unread` | `"Unread"` |
| `read` | `"Read"` |
| `markRead` | `"Mark as read"` (visible) |
| `markReadNamed` | `"Mark as read: {title}"` (accessible name; keep the visible words in it) |
| `markAllRead` | `"Mark all as read"` |
| `action` | `"View"` |
| `empty` | `"No notifications"` |

## Relative time

Times are shown relative to `now` ("5 minutes ago", "yesterday") through the
platform's `Intl.RelativeTimeFormat` in `locale`, inside a `<time>` whose
`dateTime` is the exact instant and whose `title` is the full date. The helper
is exported:

```ts
import { formatRelativeTime } from "@particle-academy/react-fancy";

formatRelativeTime(Date.now() - 5 * 60_000, { locale: "es" }); // "hace 5 minutos"
```

## Accessibility

- A `<section>` labelled by its heading, holding a `<ul role="list">`.
- Read and unread are said in words on every item ("Unread" / "Read"), with
  weight and a dot as extra cues, never colour alone.
- Titles, bodies and action text are `dir="auto"`, so a right-to-left
  notification lays out right-to-left on a left-to-right page.
- Text uses the `text` and `text-soft` tokens on the `surface` token (and
  `text` on `surface-muted` for the "Unread" chip), each 7:1 or better at the
  defaults in both modes (WCAG AAA). The action link is the `text` colour,
  underlined. A host that re-tokens owns the contrast of its own values.
- Under touch density the action links and buttons are 44px targets.

## Live updates

The inbox holds no data, so whatever produces `items` keeps it current. That
is the integration point for fancy-query: a query over the notifications whose
cache a broadcast (Echo) event invalidates, with the inbox re-rendering when
`items` changes, and the bell's `count` derived from the same data. A
ready-made fancy-query helper for this is not part of react-fancy.

## Stable handles

| Selector | What |
|----------|------|
| `[data-react-fancy-notification-inbox]` | Root `<section>`. `data-unread` is the unread count |
| `[data-react-fancy-notification-inbox-header]` | The header row |
| `[data-react-fancy-notification-inbox-count]` | "N unread" |
| `[data-react-fancy-notification-inbox-mark-all-read]` | "Mark all as read" |
| `[data-react-fancy-notification-inbox-item]` | An item (VALUE is its id; `data-read` is `true` / `false`) |
| `[data-react-fancy-notification-inbox-title]` | Its title |
| `[data-react-fancy-notification-inbox-body]` | Its body |
| `[data-react-fancy-notification-inbox-time]` | Its `<time>` |
| `[data-react-fancy-notification-inbox-state]` | The state word (VALUE is `read` / `unread`) |
| `[data-react-fancy-notification-inbox-action]` | Its action link |
| `[data-react-fancy-notification-inbox-mark-read]` | Its "Mark as read" button |
| `[data-react-fancy-notification-inbox-empty]` | The empty state |

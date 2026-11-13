# NotificationBell

An icon button with an unread count, for opening a notification inbox.
Controlled: `count` and `open` are data in, `onOpenChange` is the event out.

## Import

```tsx
import { NotificationBell } from "@particle-academy/react-fancy";
// or the subpath
import { NotificationBell } from "@particle-academy/react-fancy/notification-bell";
```

## Basic Usage

```tsx
<NotificationBell count={unread} open={open} onOpenChange={setOpen} />
```

With a `Popover` holding a `NotificationInbox`, the popover sets the open
state, so leave `open` unset:

```tsx
<Popover placement="bottom-end">
  <Popover.Trigger>
    <NotificationBell count={unread} />
  </Popover.Trigger>
  <Popover.Content aria-label="Notifications" className="w-96 p-0">
    <NotificationInbox items={items} onMarkRead={markRead} onMarkAllRead={markAllRead} />
  </Popover.Content>
</Popover>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| count | `number` | **required** | Unread notifications. Floored at 0 |
| max | `number` | `99` | Above this the badge shows `labels.overflow` ("99+") |
| open | `boolean` | - | Whether the inbox it opens is open, as `aria-expanded`. Unset: no `aria-expanded` (let a `Popover.Trigger` set it) |
| onOpenChange | `(open: boolean) => void` | - | Called on click with `!open`. Does not change `open` itself |
| labels | `NotificationBellLabels` | English | See below |
| ...rest | `ButtonProps` | - | Everything else reaches the `<button>` (a kit `Button`, `variant="ghost"` by default), with the `ref` |

### Labels

| Key | Default |
|-----|---------|
| `button` | `"Notifications"` (the accessible name with no count) |
| `buttonCount` | `"{button}, {count} unread"` (the name while a count shows; `{count}` is the badge text) |
| `unread` | `"{count} unread notifications"` |
| `unreadOne` | `"1 unread notification"` |
| `none` | `"No unread notifications"` |
| `overflow` | `"{max}+"` |

## Accessibility

- The button is named "Notifications, 3 unread" while it shows a count
  (`labels.buttonCount`) and "Notifications" without one (`labels.button`).
  The badge is `aria-hidden`, but its number is visible text, so it is in the
  name (WCAG 2.5.3 Label in Name). A change of count is said in words in a
  polite `role="status"` region next to the button, without moving focus. The
  region sits outside the button, because a live region inside a button is not
  reliably announced.
- The badge's number is white on red-800 in both modes, 8:1 or better (WCAG
  AAA).
- Under touch density it is 44 x 44, like every kit `Button`.

## Stable handles

| Selector | What |
|----------|------|
| `[data-react-fancy-notification-bell]` | The button. `data-count` is the count, `data-unread` is `true` / `false` |
| `[data-react-fancy-notification-bell-count]` | The badge (only while `count > 0`) |
| `[data-react-fancy-notification-bell-status]` | The polite status region |

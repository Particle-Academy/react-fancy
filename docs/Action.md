# Action

A versatile button component with support for icons, emojis, avatars, badges, loading states, and color variants.

## Import

```tsx
import { Action } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Action>Click me</Action>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `"default" \| "circle" \| "ghost"` | `"default"` | Shape/fill variant. `"ghost"` is transparent with subtle hover. |
| color | `ActionColor` | - | Standalone color (overrides state colors). One of: `"blue"`, `"emerald"`, `"amber"`, `"red"`, `"violet"`, `"indigo"`, `"sky"`, `"rose"`, `"orange"`, `"zinc"` |
| size | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Button size |
| active | `boolean` | - | Active state (blue highlight) |
| checked | `boolean` | - | Checked state (emerald highlight) |
| warn | `boolean` | - | Warning state (amber highlight) |
| alert | `boolean` | - | Pulsing animation on the entire button |
| icon | `string` | - | Leading icon slug resolved via the Icon component |
| iconTrailing | `string` | - | Trailing icon slug |
| iconPlace | `string` | `"left"` | Icon placement. Supports: `"left"`, `"right"`, `"top"`, `"bottom"`, and compound positions like `"top left"`, `"bottom right"` |
| alertIcon | `string` | - | Pulsing alert icon slug |
| alertIconTrailing | `boolean` | - | Position alert icon on trailing side |
| emoji | `string` | - | Leading emoji slug |
| emojiTrailing | `string` | - | Trailing emoji slug |
| avatar | `string` | - | Avatar image URL |
| avatarTrailing | `boolean` | - | Position avatar on trailing side |
| badge | `string` | - | Badge text |
| badgeTrailing | `boolean` | - | Position badge on trailing side |
| sort | `string` | `"eiab"` | Sort order of decorative elements: `e`=emoji, `i`=icon, `a`=avatar, `b`=badge |
| loading | `boolean` | `false` | Show loading spinner (disables the button) |
| disabled | `boolean` | - | Disable the button |
| href | `string` | - | Render as an anchor tag instead of a button. Sanitized to a safe-protocol allow-list (since v2.5.0) — `javascript:`, `data:`, `vbscript:` are silently dropped and the component renders a `<button>` instead of an `<a>`. |

Also extends all native `<button>` HTML attributes (except `color`).

## Examples

### Icon button with color

```tsx
<Action icon="pencil" color="blue" size="lg">
  Edit
</Action>
```

### Circle icon button

```tsx
<Action variant="circle" icon="plus" color="emerald" />
```

### Loading state with badge

```tsx
<Action loading badge="3" badgeTrailing>
  Messages
</Action>
```

### Link button with trailing icon

```tsx
<Action href="/docs" iconTrailing="arrow-right">
  Read docs
</Action>
```

### Ghost variant

```tsx
<Action variant="ghost" color="red" icon="trash-2">Delete</Action>
<Action variant="ghost" icon="download">Export</Action>
```

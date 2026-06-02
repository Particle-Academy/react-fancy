# Button

A versatile button component with support for icons, emojis, avatars, badges, loading states, and color variants.

> **Naming:** `Button` is the canonical name. It was originally shipped as
> `Action`, which remains available as a **deprecated alias** for backward
> compatibility and will be removed in a future major version. New code should
> import `Button`. See [Action](./Action.md).

## Import

```tsx
import { Button } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Button>Click me</Button>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `"default" \| "circle" \| "ghost"` | `"default"` | Shape/fill variant. `"ghost"` is transparent with subtle hover. |
| color | `ButtonColor` (= `Color`) | - | Standalone color (overrides state colors) — the full Tailwind v4 palette — 5 grays (`slate`, `gray`, `zinc`, `neutral`, `stone`) + every hue (`red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`). |
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

`ButtonProps` is the prop type; `ButtonColor` is the color-name union. The legacy
`ActionProps` / `ActionColor` names remain as deprecated aliases.

## Examples

### Icon button with color

```tsx
<Button icon="pencil" color="blue" size="lg">
  Edit
</Button>
```

### Circle icon button

```tsx
<Button variant="circle" icon="plus" color="emerald" />
```

### Loading state with badge

```tsx
<Button loading badge="3" badgeTrailing>
  Messages
</Button>
```

### Link button with trailing icon

```tsx
<Button href="/docs" iconTrailing="arrow-right">
  Read docs
</Button>
```

### Ghost variant

```tsx
<Button variant="ghost" color="red" icon="trash-2">Delete</Button>
<Button variant="ghost" icon="download">Export</Button>
```

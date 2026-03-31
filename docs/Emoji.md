# Emoji

Renders an emoji character by name slug or direct emoji string.

## Import

```tsx
import { Emoji } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Emoji name="rocket" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| name | `string` | - | Emoji slug resolved via the built-in emoji utils |
| emoji | `string` | - | Direct emoji character (takes precedence over `name` resolution) |
| size | `"sm" \| "md" \| "lg" \| "xl"` | `"md"` | Display size. Maps to: sm=text-base, md=text-2xl, lg=text-4xl, xl=text-6xl |
| className | `string` | - | Additional CSS classes |

Returns `null` if neither `emoji` nor `name` resolves to a character.

## Examples

### By name

```tsx
<Emoji name="fire" size="lg" />
```

### Direct emoji character

```tsx
<Emoji emoji="👋" size="xl" />
```

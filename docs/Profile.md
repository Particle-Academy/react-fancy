# Profile

A profile display component that combines an Avatar with a name and optional subtitle.

## Import

```tsx
import { Profile } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Profile name="Jane Doe" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | - | Avatar image URL |
| alt | `string` | - | Avatar alt text (falls back to `name`) |
| fallback | `string` | - | Fallback initials for the avatar |
| name | `string` | **required** | Display name |
| subtitle | `string` | - | Secondary text (role, email, etc.) |
| size | `"sm" \| "md" \| "lg"` | `"md"` | Overall size |
| status | `"online" \| "offline" \| "busy" \| "away"` | - | Status indicator on the avatar |
| className | `string` | - | Additional CSS classes |

## Examples

### With avatar and status

```tsx
<Profile
  src="/photo.jpg"
  name="Jane Doe"
  subtitle="Product Designer"
  status="online"
/>
```

### Fallback initials

```tsx
<Profile
  fallback="AB"
  name="Alice Brown"
  subtitle="alice@example.com"
  size="lg"
/>
```

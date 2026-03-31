# Avatar

A circular avatar component with image, fallback initials, and optional online status indicator.

## Import

```tsx
import { Avatar } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Avatar src="/photo.jpg" alt="Jane Doe" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | - | Image source URL |
| alt | `string` | `""` | Alt text for the image |
| fallback | `string` | - | Fallback initials when no image is provided |
| size | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Avatar size |
| status | `"online" \| "offline" \| "busy" \| "away"` | - | Online status indicator dot |
| className | `string` | - | Additional CSS classes |

## Examples

### With fallback initials and status

```tsx
<Avatar fallback="JD" size="lg" status="online" />
```

### Small avatar with image

```tsx
<Avatar src="/avatar.png" alt="User" size="sm" status="busy" />
```

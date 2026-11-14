# LiveBadge

A live channel's status, as a `Badge`:

- LIVE: red, with a dot
- Starting: amber
- Offline: zinc
- Ended: zinc

The status is yours to supply, from the provider's API or your stream
server's status endpoint. The badge does not probe anything.

## Import

```tsx
import { LiveBadge } from "@particle-academy/react-fancy";
import { LiveBadge } from "@particle-academy/react-fancy/live-badge";
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` | `"live" \| "starting" \| "offline" \| "ended"` | `"live"` | |
| `dot` | `boolean` | on while live | |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | |
| `labels` | `Partial<LiveBadgeLabels>` | English | `live`, `starting`, `offline`, `ended` |

## Handles

`data-react-fancy-live-badge`, `data-live-status`.

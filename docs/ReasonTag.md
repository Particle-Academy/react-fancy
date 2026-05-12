# ReasonTag

Wrap any value with a small affordance that reveals the agent's reasoning, sources, and confidence on hover or click. Explainability becomes a primitive instead of an afterthought.

Promoted from the dreaming sandbox on 2026-05-12.

## Import

```tsx
import { ReasonTag } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<ReasonTag
  value="$1.4M"
  reason="Projected Q3 ARR after stacking renewals."
  confidence={0.91}
  sources={[{ label: "Q2 actuals · CRM export" }]}
  by="Forecaster"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `ReactNode` | — | The wrapped value (number, label, short phrase). |
| reason | `string` | — | Free-text rationale shown in the popover. |
| confidence | `number` | `1` | 0..1 — drives the colour tier (green ≥ 0.85, amber ≥ 0.6, red below). |
| sources | `ReasonTagSource[]` | `[]` | `{ label, href? }` list rendered in the popover. |
| by | `string` | — | Optional author / agent name shown in the popover header. |
| theme | `"dot" \| "underline" \| "chip"` | `"dot"` | Visual treatment for the trigger. |
| pinned | `boolean` | `false` | When true, the reason is rendered inline as a margin annotation (no popover). |
| onFollowUp | `() => void` | — | Optional callback for the "ask follow-up" action in the popover. |
| className | `string` | — | Applied to the trigger element. |

## Confidence Tiers

| Range | Colour | Label |
|-------|--------|-------|
| ≥ 0.85 | emerald | high |
| ≥ 0.6 | amber | medium |
| < 0.6 | red | low |

Quick visual scan tells you which suggestions deserve a closer look without opening any tooltips.

## Examples

### Three visual styles

```tsx
<ReasonTag value="42" reason="…" theme="dot" />
<ReasonTag value="42" reason="…" theme="underline" />
<ReasonTag value="42" reason="…" theme="chip" />
```

### Always-visible inline annotation

```tsx
<ReasonTag value="$60k" reason="Expansion uplift applied at the historical rate." pinned />
```

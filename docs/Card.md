# Card

A container with optional media, header, body and footer sections. `Object.assign` exposes the sub-components as compound members (`Card.Header`, `Card.Bleed`, …).

## Import

```tsx
import { Card } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Card>
  <Card.Body>Content goes here</Card.Body>
</Card>
```

## Padding sits on the children, not the card

This is the one thing worth knowing before anything else, because most of the
rest follows from it. `padding` compiles to `[&>*]:px-4 [&>*]:py-3` — an inset
on every **direct child** of the card, not on the card itself.

That is why a full-bleed child (`Card.Media`, `Card.Bleed`) can opt out with
`!px-0` instead of having to undo padding already baked into the frame, and why
there is no `gap` prop: each child carries its own `py-*`, so two adjacent
sections already have twice that between their content.

It also means anything that must line up with the content's edge — an inset
divider, a bleed — is derived from the **padding step**, never from `size`.
`size` only picks the default step; `padding` overrides it.

## Card Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `"outlined" \| "elevated" \| "flat" \| "muted" \| "soft"` | `"outlined"` | Surface treatment. `outlined` is untinted with a border; `elevated` adds `shadow-md`; `soft` → `flat` → `muted` is a ramp of increasingly strong tints, all borderless |
| size | `"xs" \| "sm" \| "md" \| "lg"` | `"md"` | Scales padding and corner radius together, and is inherited by `Card.Media` and `Card.Bleed` |
| padding | `"none" \| "xs" \| "sm" \| "md" \| "lg"` | the step `size` implies | The inset applied to every direct child. Pass it to override `size`, including `"none"` |
| sections | `"divided" \| "plain" \| "banded"` | `"divided"` | How `Card.Header` / `Card.Footer` are set apart: a hairline rule, nothing, or a tinted band |
| dividerInset | `boolean` | `false` | With `sections="divided"`, stop the rules at the content's edge instead of running them across the card |
| highlight | `boolean` | `false` | A 1px hairline just inside the top edge — white at 70% in light mode, white at 10% in dark. Reads on a tinted or elevated surface; invisible on an untinted white one |
| interactive | `boolean` | `false` | Card is a link or a grid tile: hover lift, border and shadow response, and `overflow-hidden` so a `Card.Media` is clipped to the rounded corners |

Also extends all native `<div>` HTML attributes.

`sections`, `size`, `padding` and `dividerInset` are passed down through context,
so the sub-components never need them repeated.

## Sub-Components

### Card.Media

The fixed-ratio media region at the top of a card: a thumbnail, gradient or
solid swatch, with slots pinned to its corners. Opts out of the card's padding,
and rounds its top corners to match the card's `size`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | `string` | - | Image URL. Omit for a pure colour or gradient tile |
| alt | `string` | `""` | Alt text for the image |
| ratio | `string` | `"16/9"` | CSS `aspect-ratio`. Ignored when `height` is set |
| height | `number \| string` | - | Fixed height instead of an aspect ratio |
| background | `string` | - | Any CSS background value. Shows **under** the image — while it loads, and permanently if it never arrives, so a missing thumbnail degrades to a colour rather than a hole |
| objectPosition | `string` | `"center"` | `object-position` for the image |
| loading | `"lazy" \| "eager"` | `"lazy"` | Image loading strategy |
| topLeft / topRight / bottomLeft / bottomRight | `ReactNode` | - | Slots pinned to the media's corners — a number chip, a status pill |

### Card.Header / Card.Footer

The same component with the rule on opposite edges. Either can be composed from
props, or given `children` for full control.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| heading | `ReactNode` | - | The title. Rendered through `<Heading>` and tagged `data-react-fancy-card-heading` |
| headingLevel | `"h1"…"h6"` | `"h3"` | Which heading element to render |
| description | `ReactNode` | - | Supporting line under the heading. Rendered through a muted `<Text>`, tagged `data-react-fancy-card-description` |
| actions | `ReactNode` | - | Controls pushed to the far end, vertically centred on the heading. Tagged `data-react-fancy-card-actions` |
| size | `"xs" \| "sm" \| "md" \| "lg"` | `"md"` | **Only used with no `Card` above** — a standalone section has no card to inherit a size from |
| children | `ReactNode` | - | Full control. **Wins over** `heading` / `description` / `actions` rather than rendering alongside them |

Both work **standalone**, outside a `Card`, as a section heading above one. A
standalone section pads itself and draws no rule — there is no card whose edge
it could be dividing.

### Card.Body

A plain content section. Carries no classes of its own: the card pads it through
`[&>*]`. Accepts all `<div>` HTML attributes.

### Card.Bleed

Runs content out to the card's edges — an image, a table, a chart strip.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| edges | `"x" \| "top" \| "bottom" \| "all"` | `"x"` | Which edges to reach. `"x"` is the sides only, which is what an inline image or table wants |

Two cases, handled automatically:

- **Inside a `Card.Header` / `Card.Body` / `Card.Footer`** — the padding is on
  that section, so the bleed escapes it with a negative margin.
- **As a direct child of `Card`** — the bleed *is* the padded element, so it
  zeroes its own padding instead. A negative margin here would pull the content
  clean outside the card.

`edges` cancels the padding of **the element the bleed sits in**, which is the
card's edge only when the bleed is actually at that edge. `edges="top"` on a
bleed halfway down a body pulls it up over the preceding content instead — use
`"top"` when the bleed is the first thing in the card, `"bottom"` when it is the
last, and `"x"` everywhere in between.

Corners are rounded only where the content meets the card, so a mid-body strip
stays square while one at the top follows the card's radius.

## Examples

### Full card with a composed header

No layout wrapper from the caller — `heading` / `description` / `actions` lay
themselves out.

```tsx
<Card variant="elevated" size="lg">
  <Card.Header
    heading="Billing"
    description="Cards, invoices and receipts"
    actions={<Button size="sm">Edit</Button>}
  />
  <Card.Body>
    <Text>Configure your preferences below.</Text>
  </Card.Body>
  <Card.Footer actions={<Button>Save</Button>} />
</Card>
```

### A media card

```tsx
<Card interactive>
  <Card.Media
    src="/covers/atlas.jpg"
    alt="Atlas"
    background="linear-gradient(135deg,#6366f1,#8b5cf6)"
    topRight={<Badge>new</Badge>}
  />
  <Card.Header heading="Atlas" description="Updated 2 days ago" />
</Card>
```

`background` is not decoration: it shows while the image loads and stays if the
image never arrives.

### Seamless sections

```tsx
<Card sections="plain">
  <Card.Header heading="No rules" />
  <Card.Body>…</Card.Body>
</Card>
```

`"banded"` tints the header and footer instead; `dividerInset` keeps the rules
but stops them at the content's edge.

### A full-bleed table

```tsx
<Card>
  <Card.Header heading="Invoices" />
  <Card.Body>
    <Card.Bleed>
      <Table data={invoices} />
    </Card.Bleed>
  </Card.Body>
</Card>
```

### A heading above a card

```tsx
<Card.Header heading="Team" description="4 members" actions={<Button size="sm">Invite</Button>} />
<Card>
  <Card.Body>…</Card.Body>
</Card>
```

### An escape hatch

`children` wins over the composition props, so an unusual header is still a
`Card.Header`:

```tsx
<Card>
  <Card.Header>
    <Profile name="Ada" role="Owner" />
  </Card.Header>
  <Card.Body>…</Card.Body>
</Card>
```

## Data attributes

| Selector | Element |
|----------|---------|
| `[data-react-fancy-card]` | the card |
| `[data-react-fancy-card-media]` | `Card.Media` |
| `[data-react-fancy-card-header]` | `Card.Header` |
| `[data-react-fancy-card-body]` | `Card.Body` |
| `[data-react-fancy-card-footer]` | `Card.Footer` |
| `[data-react-fancy-card-bleed]` | `Card.Bleed` |
| `[data-react-fancy-card-heading]` | the `heading` a section rendered |
| `[data-react-fancy-card-description]` | the `description` a section rendered |
| `[data-react-fancy-card-actions]` | the `actions` a section rendered |

See [STYLE.md](../STYLE.md) for theming through these.

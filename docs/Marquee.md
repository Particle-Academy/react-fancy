# Marquee

An edge-to-edge auto-scrolling strip of items (logos, capability words, tickers). Seamless wrap via internal content doubling, masked fade edges, decorative by default (`aria-hidden`), and no animation under `prefers-reduced-motion`.

## Import

```tsx
import { Marquee } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Marquee items={["Motion", "Film", "Scroll", "Brand", "Web"]} />
```

Or with children — each child is one strip item:

```tsx
<Marquee speed={60} pauseOnHover separator={<span>✸</span>}>
  {providers.map((p) => (
    <span key={p}>{p}</span>
  ))}
</Marquee>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | `ReactNode[]` | - | Data-driven items (alternative to children) |
| children | `ReactNode` | - | Item nodes — each child is one strip item |
| speed | `number` | `40` | Scroll speed in px/s — perceived speed stays constant regardless of content width. Ignored when `duration` is set |
| duration | `number` | - | Explicit seconds per loop (overrides `speed`) |
| direction | `"left" \| "right"` | `"left"` | Scroll direction — run opposing pairs by flipping one strip |
| pauseOnHover | `boolean` | `false` | Pause the animation while hovered |
| paused | `boolean` | `false` | Controlled pause — `true` freezes the strip |
| gap | `number \| string` | `40` | Gap between items (number = px) |
| fade | `boolean \| number \| string` | `true` | Masked fade at the strip edges: `true` (48px), `false` to disable, or a custom width |
| separator | `ReactNode` | - | Optional node rendered between items |
| angle | `number` | `0` | Tilt the whole strip in degrees (e.g. `-1` for the torn, off-axis band look). The strip widens slightly to stay edge-to-edge |
| decorative | `boolean` | `true` | Decorative strips are `aria-hidden`. Set `false` to expose the content to assistive tech (the duplicated loop copies stay hidden either way) |
| className | `string` | - | Additional CSS classes |

Remaining props are forwarded to the root `<div>` (e.g. `aria-label` when `decorative={false}`).

## Opposing pairs

The Kinetic-style stacked strips that scroll against each other:

```tsx
<Marquee items={words} direction="left" />
<Marquee items={words} direction="right" />
```

## The Kinetic ticker, in one element

The Inspiration Gallery's Kinetic clients marquee — big type, magenta separator glyphs, reverse direction, masked edges — is one `<Marquee>`; typography and color simply inherit from `className`:

```tsx
<Marquee
  items={clients}
  direction="right"
  fade="8%"
  separator={<span className="text-fuchsia-500 text-[0.7em]">✸</span>}
  className="border-y py-6 text-3xl font-bold tracking-tight text-zinc-400"
/>
```

## Short content

Content is automatically repeated until one loop copy fills the container, so a marquee with two short words still scrolls edge-to-edge with no blank wrap — no manual `[...items, ...items, ...items]` duplication.

## Constant perceived speed

`speed` is px/s: the component measures the content and derives the loop duration, so a short strip and a long strip move at the same visual pace. Pass `duration` instead when you want an exact seconds-per-loop:

```tsx
<Marquee items={logos} duration={30} />
```

## Accessibility

- The strip is `aria-hidden` by default — marquees are usually decorative duplication of content that exists elsewhere on the page.
- Set `decorative={false}` (plus an `aria-label`) to expose the first copy of the content; the internal duplicate copy is always `aria-hidden`.
- Under `prefers-reduced-motion: reduce` the strip does not animate at all — the content simply sits as a static row.

## Stable handles

| Selector | Element |
|----------|---------|
| `[data-react-fancy-marquee]` | Root (also carries `data-direction`, `data-paused`) |
| `[data-react-fancy-marquee-track]` | The animated track |
| `[data-react-fancy-marquee-group]` | One content copy (two per track) |
| `[data-react-fancy-marquee-item]` | One item (carries `data-index`) |
| `[data-react-fancy-marquee-separator]` | Separator node between items |

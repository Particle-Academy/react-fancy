# SkipLink

A "Skip to content" link (WCAG 2.4.1, Bypass Blocks). It is visually hidden
until it is focused, then appears at the top-start corner of the viewport.
Activating it moves focus to the page's main content, so a keyboard user does
not have to tab through the whole header first.

## Import

```tsx
import { SkipLink } from "@particle-academy/react-fancy";
// or the subpath
import { SkipLink } from "@particle-academy/react-fancy/skip-link";
```

## Basic Usage

Render it first in the page, before the header, so it is the first tab stop.
With no props it targets `#main`:

```tsx
<body>
  <SkipLink />
  <header>…</header>
  <main id="main">…</main>
</body>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| targetId | `string` | `"main"` | The id of the element to skip to, without `#` |
| href | `string` | `"#" + targetId` | The fragment to link to. Wins over `targetId` |
| label | `ReactNode` | `"Skip to content"` | The link text |
| className | `string` | - | Extra classes; they win over the shipped look |

Every other anchor attribute (`id`, `data-*`, `aria-*`, `onClick`) is forwarded,
and a `ref` reaches the `<a>`.

## Behaviour

- **Hidden until focused.** Unfocused it is clipped to nothing, not
  `display: none`, so it stays in the tab order and the accessibility tree.
  Focused it shows over everything (`z-index: 100`) in the `surface`, `text`,
  `border-strong` and `focus` theme tokens, with their dark pairs.
- **The look ships in `styles.css`**, keyed on its handle, so it is hidden even
  in an app whose Tailwind build has not `@source`d the kit. It is in the `base`
  layer: a `className` you pass still wins.
- **Activation moves focus, not just the scroll.** If the target cannot take
  focus (a `<main>`, a `<div>`) and has no `tabindex`, it gets `tabIndex=-1`
  first. A target that already has a `tabindex`, or that is focusable on its
  own (a button, a link), is left alone.
- **The click is handled by the link,** so a hash router never sees the
  fragment. If there is no element with that id, the browser's own fragment
  navigation runs instead.
- Renders on the server: it reads `document` only when it is activated.
- Under [touch density](TouchDensity.md) it is at least 44 x 44.

## Stable handles

| Selector | Element |
|----------|---------|
| `[data-skip-link]` | the `<a>`; the handle an accessibility sweep should target |
| `[data-react-fancy-skip-link]` | the same `<a>`, in the kit's usual naming |

## Examples

### A different target and label

```tsx
<SkipLink targetId="content" label="Zum Inhalt springen" />
<div id="content">…</div>
```

### Restyled

```tsx
<SkipLink className="rounded-full bg-violet-700 text-white" />
```

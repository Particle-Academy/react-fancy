# FullScreen

One full-screen behaviour for every surface that can take over the viewport. `Editor` uses it; DeckEditor (fancy-slides) and SheetWorkbook (fancy-sheets) are meant to adopt the same hook.

## Import

```tsx
import { FullScreen, useFullScreen, FullScreenProvider } from "@particle-academy/react-fancy";
// or the subpath
import { FullScreen } from "@particle-academy/react-fancy/full-screen";
```

## A box with a toggle

```tsx
<FullScreen className="rounded-xl border bg-white dark:bg-zinc-900">
  <FullScreen.Toggle />
  <Chart … />
</FullScreen>
```

Give it a background: while active it covers the page, and in `native` mode the browser paints black behind anything transparent.

## A surface that owns its root

```tsx
function DeckEditor({ fullScreen, defaultFullScreen, onFullScreenChange }) {
  const fs = useFullScreen<HTMLDivElement>({ fullScreen, defaultFullScreen, onFullScreenChange });
  return (
    <FullScreenProvider value={fs}>
      <div {...fs.targetProps} data-fancy-deck-editor="" className="flex flex-col …">
        <Toolbar>
          <FullScreen.Toggle />
        </Toolbar>
        <Canvas className="min-h-0 flex-1" />
      </div>
    </FullScreenProvider>
  );
}
```

`targetProps` carries the ref, `data-fullscreen`, the overlay `style` and the `onKeyDown` handler. If the root has its own `style` or `onKeyDown`, merge them. `FullScreenProvider` makes `<FullScreen.Toggle />` work anywhere inside and redirects descendant `<Portal>`s into the surface while it is active.

## Overlay or the browser's Fullscreen API

| `mode` | What happens | When it fails |
|---|---|---|
| `"overlay"` (default) | The element itself becomes `position: fixed` over the viewport, in place, with `z-index` 50 (as `Modal`) | Never refused. An ancestor with `transform`, `filter`, `perspective` or `contain: paint` confines it to that ancestor |
| `"native"` | The overlay, plus `element.requestFullscreen()` so the browser chrome hides too | Refused in an iframe without `allow="fullscreen"`, without a user gesture, or by a permissions policy. It then stays in the overlay. `data-fullscreen-mode` says which one is active |

The overlay is the default because it never asks the browser for permission. The element is not portalled, so nothing inside remounts. An editor keeps its caret, undo history and seeded content.

In `native` mode the browser handles Esc itself. When the user leaves through the browser's UI, `onFullScreenChange(false)` fires so controlled state stays in sync.

## Behaviour

- **Controlled:** `fullScreen` + `onFullScreenChange`, or `defaultFullScreen` uncontrolled. `onFullScreenChange` only fires on real transitions.
- **Escape** leaves full screen. An Escape that a child already handled (`preventDefault`), or that comes from a menu or dialog opened from inside, is left to that child. The Escape is stopped at the surface, so an enclosing dialog does not also close. `closeOnEscape={false}` turns this off.
- **Focus** moves inside on entry if it was outside. On exit it returns to the element that had it before, unless the user has since focused something else. Tab wraps within the surface.
- **Scroll:** body scroll is locked while active (`lockScroll`, reference-counted). On exit the window and every scrolled ancestor go back to their offsets. Those offsets are read before the surface leaves the flow, which would otherwise clamp them.
- **SSR:** nothing touches `window` or `document` during render. A surface that starts full screen renders the overlay on the server.

## Props / options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| fullScreen | `boolean` | - | Controlled flag |
| defaultFullScreen | `boolean` | `false` | Initial flag when uncontrolled |
| onFullScreenChange | `(fullScreen: boolean) => void` | - | Requested state, from the toggle, Escape, `setFullScreen` or the browser |
| mode | `"overlay" \| "native"` | `"overlay"` | See above |
| closeOnEscape | `boolean` | `true` | Leave on Escape |
| lockScroll | `boolean` | `true` | Lock body scroll while active |
| zIndex | `number` | `50` | Stacking order of the overlay |
| labels | `{ enter?: string; exit?: string }` | "Enter full screen" / "Exit full screen" | Toggle accessible names |

`useFullScreen()` returns `{ fullScreen, setFullScreen, toggle, activeMode, ref, targetProps, toggleProps, portalContainer }`.

### FullScreen.Toggle

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| enterIcon | `string` | `"maximize-2"` | Lucide name shown while not full screen |
| exitIcon | `string` | `"minimize-2"` | Lucide name shown while full screen |
| children | `ReactNode \| (fullScreen) => ReactNode` | - | Replace the icon |

Renders nothing outside a `FullScreen` / `FullScreenProvider`.

## Data attributes

| Selector | Meaning |
|---|---|
| `[data-react-fancy-fullscreen]` | `<FullScreen>` root |
| `[data-fullscreen="true"]` | Any surface while full screen (also on the toggle) |
| `[data-fullscreen-mode="overlay" \| "native"]` | Which mechanism is active |
| `[data-react-fancy-fullscreen-toggle]` | Any full-screen toggle |

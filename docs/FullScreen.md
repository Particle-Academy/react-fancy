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
| `"overlay"` (default) | The element covers the viewport in place: `position: fixed` plus, where the browser has the popover API, promotion into the **top layer** with `popover="manual"` | Never refused. Without the popover API it stays `position: fixed` (z-index 50, as `Modal`) and an ancestor with `transform`, `filter`, `perspective` or `contain: paint` confines it to that ancestor |
| `"native"` | `element.requestFullscreen()`, so the browser chrome hides too | Refused in an iframe without `allow="fullscreen"`, without a user gesture, or by a permissions policy. It then drops to the overlay, top layer included. `data-fullscreen-mode` says which one is active |

The overlay is the default because it never asks the browser for permission. The element is not portalled, so nothing inside remounts. An editor keeps its caret, undo history and seeded content.

**Why the top layer.** `position: fixed` is fixed to the viewport only while no ancestor has a transform, filter, perspective or paint containment. With one, the overlay is fixed to that ancestor instead. A Tabs panel whose fade-in animation holds its end keyframe (`animation-fill-mode: both`) traps it this way, and so does a dialog centred with `transform`. A top-layer element's containing block is the viewport whatever its ancestors do. `data-fullscreen-layer` reports `"top"` (popover, or the native full screen) or `"fixed"` (no popover API, or the browser refused).

What the top layer changes:

- **Light dismiss does not apply.** The popover is `manual`, so outside clicks do not close it, and Escape goes through the surface's own handling.
- **The UA popover box is reset.** `styles.css` puts padding, border, background, text colour and overflow back to a plain box, in a zero-specificity rule in the `base` layer, so your own classes still win. Geometry is set inline. Without `styles.css` the UA popover padding, border and `Canvas` colours show.
- **Portals opened from inside stay visible**, because they are redirected into the surface. Overlays rendered from OUTSIDE the surface while it is active, such as an app-level toast, sit under it, like anything else in the page.
- **Native mode requests the browser's full screen before any popover.** Chromium refuses `requestFullscreen()` on an element that is already an open popover, so the popover is only used if that request fails.
- If something else closes the popover, the surface drops back to `position: fixed` rather than disappearing.

In `native` mode the browser handles Esc itself. When the user leaves through the browser's UI, `onFullScreenChange(false)` fires so controlled state stays in sync.

## Behaviour

- **Controlled:** `fullScreen` + `onFullScreenChange`, or `defaultFullScreen` uncontrolled. `onFullScreenChange` only fires on real transitions.
- **Escape** leaves full screen, but the innermost open layer owns it. With a Dropdown, Select, Popover, Tooltip, ContextMenu, Command or Modal open inside the surface, the first Escape closes that layer and the next one leaves full screen. Focus may still be on the menu's trigger, and the menu may have opened before the surface went full screen; neither changes this. Layers register while open through `useEscapeKey`, and `FullScreenProvider` marks them as inside the surface, so this does not depend on listener order. An Escape a child already handled (`preventDefault`) is left alone. The Escape is stopped at the surface, so an enclosing dialog does not also close. `closeOnEscape={false}` turns this off. Your own layers take part by calling `useEscapeKey(close, open)`. A surface that calls `useFullScreen()` without `FullScreenProvider` gets the recency rule only.
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

`useFullScreen()` returns `{ fullScreen, setFullScreen, toggle, activeMode, layer, ref, targetProps, toggleProps, portalContainer }`.

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
| `[data-fullscreen-layer="top" \| "fixed"]` | Whether the surface is in the top layer or relies on `position: fixed` |
| `[data-react-fancy-fullscreen-toggle]` | Any full-screen toggle |

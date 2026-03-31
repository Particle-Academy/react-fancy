# Hooks

Shared React hooks used internally by components and available for direct use.

## Import

```tsx
import {
  useControllableState,
  useOutsideClick,
  useEscapeKey,
  useFocusTrap,
  useFloatingPosition,
  useAnimation,
  useId,
  usePanZoom,
} from "@particle-academy/react-fancy";
```

---

## useControllableState

Unifies controlled and uncontrolled component patterns into a single state hook.

```tsx
const [value, setValue] = useControllableState(controlledValue, defaultValue, onChange);
```

| Param | Type | Description |
|-------|------|-------------|
| controlledValue | `T \| undefined` | External controlled value (pass `undefined` for uncontrolled) |
| defaultValue | `T` | Initial value when uncontrolled |
| onChange | `(value: T) => void` | Optional callback fired on every change |

**Returns:** `[T, (value: T | ((prev: T) => T)) => void]` -- current value and setter.

---

## useOutsideClick

Calls a handler when a click or touch occurs outside the referenced element.

```tsx
useOutsideClick(ref, handler, enabled, ignoreRef);
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| ref | `RefObject<HTMLElement \| null>` | - | Element to monitor |
| handler | `(event: MouseEvent \| TouchEvent) => void` | - | Called on outside click |
| enabled | `boolean` | `true` | Enable/disable the listener |
| ignoreRef | `RefObject<HTMLElement \| null>` | - | Optional element to exclude (e.g. a trigger) |

---

## useEscapeKey

Calls a handler when the Escape key is pressed.

```tsx
useEscapeKey(handler, enabled);
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| handler | `() => void` | - | Called on Escape keydown |
| enabled | `boolean` | `true` | Enable/disable the listener |

---

## useFocusTrap

Traps keyboard focus within a container element. Focuses the first focusable element on mount and restores focus on unmount.

```tsx
useFocusTrap(ref, enabled);
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| ref | `RefObject<HTMLElement \| null>` | - | Container to trap focus within |
| enabled | `boolean` | `true` | Enable/disable the trap |

Focusable elements: `a[href]`, `button:not([disabled])`, `input:not([disabled])`, `textarea:not([disabled])`, `select:not([disabled])`, `[tabindex]:not([tabindex='-1'])`.

---

## useFloatingPosition

Computes the absolute position for a floating element anchored to a reference element. Handles viewport clamping and automatic placement flipping.

```tsx
const { x, y, placement } = useFloatingPosition(anchorRef, floatingRef, options);
```

| Param | Type | Description |
|-------|------|-------------|
| anchorRef | `RefObject<HTMLElement \| null>` | Reference/trigger element |
| floatingRef | `RefObject<HTMLElement \| null>` | Floating element to position |
| options | `object` | Configuration (see below) |

**Options:**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| placement | `Placement` | `"bottom"` | Desired placement |
| offset | `number` | `8` | Pixel gap between anchor and floating element |
| enabled | `boolean` | `true` | Enable/disable positioning |

**Returns:** `{ x: number, y: number, placement: Placement }` -- the resolved position may differ from requested if the element was flipped to stay in viewport.

---

## useAnimation

Manages CSS animation mount/unmount lifecycle. Keeps the element mounted during the exit animation, then unmounts after `animationend`.

```tsx
const { mounted, className, ref } = useAnimation({ open, enterClass, exitClass });
```

| Option | Type | Description |
|--------|------|-------------|
| open | `boolean` | Whether the animated element should be visible |
| enterClass | `string` | CSS class applied on enter |
| exitClass | `string` | CSS class applied on exit |

**Returns:**

| Key | Type | Description |
|-----|------|-------------|
| mounted | `boolean` | Whether the element should be in the DOM |
| className | `string` | Current animation class to apply |
| ref | `RefObject<HTMLElement \| null>` | Attach to the animated element for `animationend` detection |

---

## useId

Generates a stable unique ID, optionally with a prefix. Wraps React's `useId`.

```tsx
const id = useId("dialog"); // e.g. "dialog-:r0:"
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| prefix | `string` | - | Optional prefix prepended to the id |

---

## usePanZoom

Provides pointer-event handlers for panning (click+drag on background) and Ctrl+wheel zooming on a container element.

```tsx
const { containerProps, isPanning } = usePanZoom(options);
```

**Options:**

| Key | Type | Description |
|-----|------|-------------|
| viewport | `ViewportState` | Current `{ panX, panY, zoom }` |
| setViewport | `(vp \| updater) => void` | State setter for viewport |
| minZoom | `number` | Minimum zoom level |
| maxZoom | `number` | Maximum zoom level |
| pannable | `boolean` | Enable panning |
| zoomable | `boolean` | Enable zooming |
| containerRef | `RefObject<HTMLElement \| null>` | The scrollable container |

**Returns:**

| Key | Type | Description |
|-----|------|-------------|
| containerProps | `{ onPointerDown, onPointerMove, onPointerUp }` | Spread onto the container element |
| isPanning | `boolean` | Whether a pan gesture is active |

Zooming requires Ctrl+wheel (or Cmd+wheel / pinch gesture). Normal scrolling is not hijacked.

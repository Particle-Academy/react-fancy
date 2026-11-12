# Portal

Renders children into a DOM node outside the React component tree using `createPortal`, with automatic dark mode propagation.

## Import

```tsx
import { Portal } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Portal>
  <div role="dialog" aria-label="Filters" className="fixed inset-0 z-50">…</div>
</Portal>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | **required** | Content to render in the portal |
| portalContainer | `HTMLElement \| null` | `document.body` | Element to portal into, such as a landmark (`<main>`). Wins over `container` and over a `PortalContainerContext` provider |
| container | `HTMLElement` | `document.body` | The same, under its original name |

## What lands in the container

When the child is **one host element** (a `<div>`, `<ul>`, …), that element is
what the portal puts in the container. It gets the `data-react-fancy-portal`
handle and, while `<html>` has `class="dark"` or `data-theme="dark"`, the `dark`
class, so Tailwind `dark:` utilities apply inside it. Its own role is the role
of the element in `<body>`.

Anything else (several nodes, text, or a component) is wrapped in a
`<div data-react-fancy-portal style="display: contents">` that carries the
same handle and `dark` class.

Every kit popup is a single host element with a popup role, so nothing
role-less sits in `<body>`:

| Component | Element in `<body>` |
|-----------|---------------------|
| Dropdown.Items | `role="menu"` |
| ContextMenu.Content | `role="menu"` |
| ContentReaction picker | `role="menu"` |
| Popover.Content | `role="dialog"` (a `role` you pass wins) |
| Select listbox, Autocomplete | `role="listbox"` |
| PhoneInput country picker | `role="dialog"`, named by `labels.chooseCountry` |
| EmojiSelect skin-tone picker | `role="dialog"`, named "*emoji* skin tones" |

## Landmarks

axe's `region` rule reports page content outside every landmark. A portalled
popup sits in `<body>`, outside `<main>`. Two ways to keep it clean:

- **Rely on the popup role.** Each kit popup is the element in `<body>` and
  carries its own role, with no role-less wrapper around it.
- **Portal into a landmark.** Pass `portalContainer`, or provide one element for
  every Portal below a point:

```tsx
import { PortalContainerContext } from "@particle-academy/react-fancy";

function App() {
  const [main, setMain] = useState<HTMLElement | null>(null);
  return (
    <main ref={setMain}>
      <PortalContainerContext.Provider value={main}>{/* … */}</PortalContainerContext.Provider>
    </main>
  );
}
```

A popup portalled into a container with `overflow: hidden` or a transform can
be clipped or mispositioned; `<main>` normally has neither.

Returns `null` during SSR and on the first client render (hydration-safe), then
portals after mount.

## Examples

### Custom container

```tsx
const container = document.getElementById("modal-root")!;

<Portal portalContainer={container}>
  <div>Rendered inside #modal-root</div>
</Portal>
```
